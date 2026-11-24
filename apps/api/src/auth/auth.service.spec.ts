import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';

describe('AuthService', () => {
  const usersService = {
    create: vi.fn(),
    findByEmailWithPassword: vi.fn(),
  };
  const passwordService = { hash: vi.fn(), verify: vi.fn() };
  const jwtService = { signAsync: vi.fn() };
  const config = { get: vi.fn(() => 3600) };
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: PasswordService, useValue: passwordService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('stores the hash, never the plain password', async () => {
      passwordService.hash.mockResolvedValue('hashed');
      usersService.create.mockResolvedValue({
        id: 'user-id',
        email: 'ana@example.com',
        passwordHash: 'hashed',
      });

      await service.register({
        email: 'ana@example.com',
        password: 'plain-password',
      });

      expect(passwordService.hash).toHaveBeenCalledWith('plain-password');
      expect(usersService.create).toHaveBeenCalledWith(
        'ana@example.com',
        'hashed',
      );
    });

    it('returns only the id and the email', async () => {
      passwordService.hash.mockResolvedValue('hashed');
      usersService.create.mockResolvedValue({
        id: 'user-id',
        email: 'ana@example.com',
        passwordHash: 'hashed',
      });

      const result = await service.register({
        email: 'ana@example.com',
        password: 'plain-password',
      });

      expect(result).toEqual({ id: 'user-id', email: 'ana@example.com' });
    });
  });

  describe('login', () => {
    const credentials = {
      email: 'ana@example.com',
      password: 'plain-password',
    };

    it('returns a bearer token whose subject is the user id', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        id: 'user-id',
        email: 'ana@example.com',
        passwordHash: 'hashed',
      });
      passwordService.verify.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('signed-token');

      const result = await service.login(credentials);

      expect(passwordService.verify).toHaveBeenCalledWith(
        'hashed',
        'plain-password',
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'user-id' });
      expect(result).toEqual({
        accessToken: 'signed-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    });

    it('rejects a wrong password without issuing a token', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        id: 'user-id',
        email: 'ana@example.com',
        passwordHash: 'hashed',
      });
      passwordService.verify.mockResolvedValue(false);

      await expect(service.login(credentials)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects an unknown email with the same error', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login(credentials)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
