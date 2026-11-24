import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './notification.entity.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  const repository = {
    create: vi.fn((data: Partial<Notification>) => data),
    save: vi.fn((data: Partial<Notification>) => Promise.resolve(data)),
    findAndCount: vi.fn(),
    findOneBy: vi.fn(),
    delete: vi.fn(),
  };
  let service: NotificationsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(NotificationsService);
  });

  describe('create', () => {
    it('saves the notification owned by the given user', async () => {
      const dto = {
        title: 'Welcome',
        content: 'Hello there',
        channel: 'email',
        recipient: 'ana@example.com',
      };

      await service.create('user-id', dto);

      expect(repository.save).toHaveBeenCalledWith({
        ...dto,
        userId: 'user-id',
      });
    });
  });

  describe('findAllForUser', () => {
    it('reads only that user, newest first, one page at a time', async () => {
      repository.findAndCount.mockResolvedValue([[], 45]);

      const result = await service.findAllForUser('user-id', {
        page: 3,
        limit: 20,
      });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: 40,
        take: 20,
      });
      expect(result).toEqual({ items: [], total: 45 });
    });
  });

  describe('update', () => {
    it('looks the notification up by id and owner together', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'n-1', title: 'Old' });

      await service.update('user-id', 'n-1', { title: 'New' });

      expect(repository.findOneBy).toHaveBeenCalledWith({
        id: 'n-1',
        userId: 'user-id',
      });
    });

    it('changes only the fields that were sent', async () => {
      repository.findOneBy.mockResolvedValue({
        id: 'n-1',
        title: 'Old',
        content: 'Keep me',
      });

      const result = await service.update('user-id', 'n-1', { title: 'New' });

      expect(result).toEqual({ id: 'n-1', title: 'New', content: 'Keep me' });
    });

    it('throws NotFoundException and saves nothing when there is no match', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('user-id', 'n-1', { title: 'New' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes by id and owner together', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('user-id', 'n-1');

      expect(repository.delete).toHaveBeenCalledWith({
        id: 'n-1',
        userId: 'user-id',
      });
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('user-id', 'n-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
