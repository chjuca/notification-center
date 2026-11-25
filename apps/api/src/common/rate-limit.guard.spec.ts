import { HttpException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RateLimit } from './rate-limit.js';

class DefaultController {}

@RateLimit({ limit: 2, windowMs: 60_000 })
class StrictController {}

function login() {}
function list() {}
function other() {}

function contextFor(
  controller: object,
  handler: () => void,
  ip = '10.0.0.1',
): { context: ExecutionContext; headers: Record<string, unknown> } {
  const headers: Record<string, unknown> = {};
  const context = {
    getClass: () => controller,
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => ({ ip }),
      getResponse: () => ({
        setHeader: (name: string, value: unknown) => {
          headers[name] = value;
        },
      }),
    }),
  } as unknown as ExecutionContext;
  return { context, headers };
}

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  beforeEach(() => {
    vi.useFakeTimers();
    guard = new RateLimitGuard(new Reflector());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const call = (handler = login, ip?: string, controller = StrictController) =>
    guard.canActivate(contextFor(controller, handler, ip).context);

  it('lets requests through up to the limit and reports what is left', () => {
    const first = contextFor(StrictController, login);
    const second = contextFor(StrictController, login);

    expect(guard.canActivate(first.context)).toBe(true);
    expect(guard.canActivate(second.context)).toBe(true);

    expect(first.headers).toMatchObject({
      'X-RateLimit-Limit': 2,
      'X-RateLimit-Remaining': 1,
    });
    expect(second.headers['X-RateLimit-Remaining']).toBe(0);
  });

  it('answers 429 with Retry-After once the limit is exceeded', () => {
    call();
    call();
    const blocked = contextFor(StrictController, login);

    const error = (() => {
      try {
        guard.canActivate(blocked.context);
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect(blocked.headers['Retry-After']).toBe(60);
  });

  it('starts counting again when the window ends', () => {
    call();
    call();
    expect(() => call()).toThrow(HttpException);

    vi.advanceTimersByTime(60_000);

    expect(call()).toBe(true);
  });

  it('counts each ip separately', () => {
    call(login, '10.0.0.1');
    call(login, '10.0.0.1');

    expect(call(login, '10.0.0.2')).toBe(true);
    expect(() => call(login, '10.0.0.1')).toThrow(HttpException);
  });

  it('counts each route separately', () => {
    for (let request = 0; request < 100; request++) {
      call(list, '10.0.0.1', DefaultController);
    }

    expect(() => call(list, '10.0.0.1', DefaultController)).toThrow(
      HttpException,
    );
    expect(call(other, '10.0.0.1', DefaultController)).toBe(true);
  });

  it('uses the default limit on routes without the decorator', () => {
    const { context, headers } = contextFor(DefaultController, list);

    guard.canActivate(context);

    expect(headers['X-RateLimit-Limit']).toBe(100);
  });

  it('forgets the windows that already ended', () => {
    for (let client = 0; client < 50; client++) {
      call(login, `10.0.1.${client}`);
    }
    const windows = (guard as unknown as { windows: Map<string, unknown> })
      .windows;
    expect(windows.size).toBe(50);

    vi.advanceTimersByTime(60_000);
    call(login, '10.0.2.1');

    expect(windows.size).toBe(1);
  });
});
