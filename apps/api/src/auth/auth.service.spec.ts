import { Test } from '@nestjs/testing';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';

describe('AuthService', () => {
  const usersService = { create: vi.fn() };
  const passwordService = { hash: vi.fn() };
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: PasswordService, useValue: passwordService },
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
});
