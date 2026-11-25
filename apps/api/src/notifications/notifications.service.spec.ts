import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChannelRegistry } from './channels/channel-registry.js';
import { NotificationDelivery } from './notification-delivery.entity.js';
import { Notification } from './notification.entity.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  const notificationsRepository = {
    create: vi.fn((data: Partial<Notification>) => data),
    save: vi.fn((data: Partial<Notification>) =>
      Promise.resolve({ id: 'n-1', ...data }),
    ),
    findAndCount: vi.fn(),
    findOneBy: vi.fn(),
    delete: vi.fn(),
  };
  const deliveriesRepository = {
    create: vi.fn((data: Partial<NotificationDelivery>) => ({ ...data })),
    save: vi.fn((data: Partial<NotificationDelivery>) => Promise.resolve(data)),
    find: vi.fn(),
  };
  const emailChannel = {
    name: 'email',
    validate: vi.fn<() => string[]>(() => []),
    send: vi.fn(),
  };
  const channelRegistry = {
    find: vi.fn((name: string) =>
      name === 'email' ? emailChannel : undefined,
    ),
    names: vi.fn(() => ['email', 'sms', 'push']),
  };
  const dto = {
    title: 'Welcome',
    content: 'Hello there',
    channel: 'email',
    recipient: 'ana@example.com',
  };
  const message = {
    title: 'Welcome',
    content: 'Hello there',
    recipient: 'ana@example.com',
  };
  let service: NotificationsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    emailChannel.validate.mockReturnValue([]);
    emailChannel.send.mockResolvedValue({ subject: 'Welcome' });
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationsRepository,
        },
        {
          provide: getRepositoryToken(NotificationDelivery),
          useValue: deliveriesRepository,
        },
        { provide: ChannelRegistry, useValue: channelRegistry },
      ],
    }).compile();
    service = moduleRef.get(NotificationsService);
  });

  describe('create', () => {
    it('saves the notification owned by the given user', async () => {
      await service.create('user-id', dto);

      expect(notificationsRepository.save).toHaveBeenCalledWith({
        ...dto,
        userId: 'user-id',
      });
    });

    it('sends through the channel and records the delivery as sent', async () => {
      const notification = await service.create('user-id', dto);

      expect(emailChannel.send).toHaveBeenCalledWith(message);
      expect(deliveriesRepository.save).toHaveBeenCalledWith({
        notificationId: 'n-1',
        channel: 'email',
        recipient: 'ana@example.com',
        status: 'sent',
        details: { subject: 'Welcome' },
        error: null,
      });
      expect(notification.deliveries).toHaveLength(1);
    });

    it('still creates the notification when the channel fails, recording why', async () => {
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      emailChannel.send.mockRejectedValue(new Error('provider down'));

      const notification = await service.create('user-id', dto);

      expect(notification.id).toBe('n-1');
      expect(deliveriesRepository.save).toHaveBeenCalledWith({
        notificationId: 'n-1',
        channel: 'email',
        recipient: 'ana@example.com',
        status: 'failed',
        details: {},
        error: 'provider down',
      });
    });

    it('rejects an unknown channel and saves nothing', async () => {
      await expect(
        service.create('user-id', { ...dto, channel: 'fax' }),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        response: { message: ['channel must be one of: email, sms, push'] },
      });
      expect(notificationsRepository.save).not.toHaveBeenCalled();
    });

    it('rejects what the channel does not accept, without saving or sending', async () => {
      emailChannel.validate.mockReturnValue([
        'recipient must be a valid email address',
      ]);

      await expect(service.create('user-id', dto)).rejects.toMatchObject({
        constructor: BadRequestException,
        response: { message: ['recipient must be a valid email address'] },
      });
      expect(emailChannel.validate).toHaveBeenCalledWith(message);
      expect(notificationsRepository.save).not.toHaveBeenCalled();
      expect(emailChannel.send).not.toHaveBeenCalled();
    });
  });

  describe('findAllForUser', () => {
    it('reads only that user, newest first, one page at a time', async () => {
      notificationsRepository.findAndCount.mockResolvedValue([[], 45]);

      const result = await service.findAllForUser('user-id', {
        page: 3,
        limit: 20,
      });

      expect(notificationsRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        relations: { deliveries: true },
        order: {
          createdAt: 'DESC',
          id: 'DESC',
          deliveries: { createdAt: 'ASC' },
        },
        skip: 40,
        take: 20,
      });
      expect(result).toEqual({ items: [], total: 45 });
    });
  });

  describe('update', () => {
    const stored = { id: 'n-1', userId: 'user-id', ...dto };

    beforeEach(() => {
      notificationsRepository.findOneBy.mockResolvedValue({ ...stored });
      deliveriesRepository.find.mockResolvedValue([{ id: 'd-1' }]);
    });

    it('looks the notification up by id and owner together', async () => {
      await service.update('user-id', 'n-1', { title: 'New' });

      expect(notificationsRepository.findOneBy).toHaveBeenCalledWith({
        id: 'n-1',
        userId: 'user-id',
      });
    });

    it('changes only the fields that were sent and keeps its deliveries', async () => {
      const result = await service.update('user-id', 'n-1', { title: 'New' });

      expect(result).toEqual({
        ...stored,
        title: 'New',
        deliveries: [{ id: 'd-1' }],
      });
    });

    it('does not send again', async () => {
      await service.update('user-id', 'n-1', { title: 'New' });

      expect(emailChannel.send).not.toHaveBeenCalled();
      expect(deliveriesRepository.save).not.toHaveBeenCalled();
    });

    it('validates the result of the change with its channel', async () => {
      emailChannel.validate.mockReturnValue([
        'recipient must be a valid email address',
      ]);

      await expect(
        service.update('user-id', 'n-1', { recipient: '+56912345678' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(emailChannel.validate).toHaveBeenCalledWith({
        ...message,
        recipient: '+56912345678',
      });
      expect(notificationsRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a change to an unknown channel', async () => {
      await expect(
        service.update('user-id', 'n-1', { channel: 'fax' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(notificationsRepository.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException and saves nothing when there is no match', async () => {
      notificationsRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('user-id', 'n-1', { title: 'New' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(notificationsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes by id and owner together', async () => {
      notificationsRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('user-id', 'n-1');

      expect(notificationsRepository.delete).toHaveBeenCalledWith({
        id: 'n-1',
        userId: 'user-id',
      });
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      notificationsRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('user-id', 'n-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
