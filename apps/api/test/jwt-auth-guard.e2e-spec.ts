import { Controller, Get, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import type { AuthenticatedUser } from '../src/auth/authenticated-user.js';
import { CurrentUser } from '../src/auth/current-user.decorator.js';
import { Public } from '../src/auth/public.decorator.js';

const USER_ID = '7b0f4c1e-3d55-4a51-9a51-1f0c3f1e2a10';

@Controller('probe')
class ProbeController {
  @Get('private')
  private(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Public()
  @Get('public')
  public() {
    return { open: true };
  }
}

describe('JwtAuthGuard (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  const getPrivate = (authorization?: string) => {
    const call = request(app.getHttpServer()).get('/probe/private');
    return authorization ? call.set('Authorization', authorization) : call;
  };

  it('lets a valid token through and exposes the user id', async () => {
    const token = await jwtService.signAsync({ sub: USER_ID });

    const response = await getPrivate(`Bearer ${token}`).expect(200);

    expect(response.body).toEqual({ id: USER_ID });
  });

  it('rejects a request without a token', async () => {
    await getPrivate().expect(401);
  });

  it('rejects a header that is not a bearer token', async () => {
    const token = await jwtService.signAsync({ sub: USER_ID });

    await getPrivate(`Basic ${token}`).expect(401);
  });

  it('rejects an expired token', async () => {
    const token = await jwtService.signAsync(
      { sub: USER_ID },
      { expiresIn: -10 },
    );

    await getPrivate(`Bearer ${token}`).expect(401);
  });

  it('rejects a token signed with another secret', async () => {
    const token = await jwtService.signAsync(
      { sub: USER_ID },
      { secret: 'another-secret-that-is-long-enough-000' },
    );

    await getPrivate(`Bearer ${token}`).expect(401);
  });

  it('rejects a token whose payload was tampered with', async () => {
    const token = await jwtService.signAsync({ sub: USER_ID });
    const [header, , signature] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: 'someone-else' }),
    ).toString('base64url');

    await getPrivate(`Bearer ${header}.${forgedPayload}.${signature}`).expect(
      401,
    );
  });

  it('rejects an unsigned token', async () => {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: USER_ID })}.`;

    await getPrivate(`Bearer ${token}`).expect(401);
  });

  it('leaves routes marked as public open', async () => {
    const response = await request(app.getHttpServer())
      .get('/probe/public')
      .expect(200);

    expect(response.body).toEqual({ open: true });
  });
});
