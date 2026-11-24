import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  const repository = {
    create: vi.fn((data: Partial<User>) => data),
    save: vi.fn(),
    findOne: vi.fn(),
  };
  let service: UsersService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('create', () => {
    it('stores the email trimmed and in lowercase', async () => {
      repository.save.mockImplementation((user: Partial<User>) =>
        Promise.resolve(user),
      );

      const user = await service.create('  Ana@Example.COM ', 'hash');

      expect(user.email).toBe('ana@example.com');
      expect(repository.save).toHaveBeenCalledWith({
        email: 'ana@example.com',
        passwordHash: 'hash',
      });
    });

    it('throws ConflictException when the email already exists', async () => {
      const driverError = Object.assign(new Error('duplicate key'), {
        code: '23505',
      });
      repository.save.mockRejectedValue(
        new QueryFailedError('INSERT', [], driverError),
      );

      await expect(
        service.create('ana@example.com', 'hash'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows any other database error', async () => {
      const error = new Error('connection lost');
      repository.save.mockRejectedValue(error);

      await expect(service.create('ana@example.com', 'hash')).rejects.toBe(
        error,
      );
    });
  });

  describe('findByEmailWithPassword', () => {
    it('searches by normalized email and asks for the password hash', async () => {
      repository.findOne.mockResolvedValue(null);

      await service.findByEmailWithPassword(' Ana@Example.com');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'ana@example.com' },
        select: { id: true, email: true, passwordHash: true },
      });
    });
  });
});
