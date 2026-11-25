import {
  HttpException,
  HttpStatus,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  DEFAULT_RATE_LIMIT,
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from './rate-limit.js';

interface Window {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, Window>();
  private nextCleanupAt = 0;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { limit, windowMs } =
      this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
        RATE_LIMIT_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? DEFAULT_RATE_LIMIT;

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const now = Date.now();
    this.removeExpired(now, windowMs);

    const key = [
      context.getClass().name,
      context.getHandler().name,
      request.ip ?? 'unknown',
    ].join(':');
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, window);
    }
    window.count += 1;

    const secondsToReset = Math.ceil((window.resetAt - now) / 1000);
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, limit - window.count),
    );
    response.setHeader('X-RateLimit-Reset', secondsToReset);

    if (window.count > limit) {
      response.setHeader('Retry-After', secondsToReset);
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private removeExpired(now: number, windowMs: number): void {
    if (now < this.nextCleanupAt) {
      return;
    }
    this.nextCleanupAt = now + windowMs;
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) {
        this.windows.delete(key);
      }
    }
  }
}
