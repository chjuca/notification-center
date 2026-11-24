import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './notification.entity.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  const repository = {
    create: vi.fn((data: Partial<Notification>) => data),
    save: vi.fn((data: Partial<Notification>) => Promise.resolve(data)),
    findAndCount: vi.fn(),
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
});
