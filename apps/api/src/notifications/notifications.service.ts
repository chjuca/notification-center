import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelRegistry } from './channels/channel-registry.js';
import type {
  ChannelMessage,
  NotificationChannel,
} from './channels/notification-channel.js';
import { NotificationDelivery } from './notification-delivery.entity.js';
import { Notification } from './notification.entity.js';
import type {
  CreateNotificationDto,
  ListNotificationsQuery,
  UpdateNotificationDto,
} from './notifications.dto.js';

function toMessage({
  title,
  content,
  recipient,
}: ChannelMessage): ChannelMessage {
  return { title, content, recipient };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationDelivery)
    private readonly deliveriesRepository: Repository<NotificationDelivery>,
    private readonly channelRegistry: ChannelRegistry,
  ) {}

  async create(
    userId: string,
    dto: CreateNotificationDto,
  ): Promise<Notification> {
    const channel = this.resolveValidChannel(dto);

    const notification = await this.notificationsRepository.save(
      this.notificationsRepository.create({ ...dto, userId }),
    );
    notification.deliveries = [await this.deliver(channel, notification)];
    return notification;
  }

  async findAllForUser(
    userId: string,
    { page, limit }: ListNotificationsQuery,
  ): Promise<{ items: Notification[]; total: number }> {
    const [items, total] = await this.notificationsRepository.findAndCount({
      where: { userId },
      relations: { deliveries: true },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
        deliveries: { createdAt: 'ASC' },
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.notificationsRepository.findOneBy({
      id,
      userId,
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    Object.assign(notification, dto);
    this.resolveValidChannel(notification);

    const saved = await this.notificationsRepository.save(notification);
    saved.deliveries = await this.deliveriesRepository.find({
      where: { notificationId: id },
      order: { createdAt: 'ASC' },
    });
    return saved;
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.notificationsRepository.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException('Notification not found');
    }
  }

  private resolveValidChannel(
    notification: ChannelMessage & { channel: string },
  ): NotificationChannel {
    const channel = this.channelRegistry.find(notification.channel);
    if (!channel) {
      throw new BadRequestException([
        `channel must be one of: ${this.channelRegistry.names().join(', ')}`,
      ]);
    }

    const problems = channel.validate(toMessage(notification));
    if (problems.length > 0) {
      throw new BadRequestException(problems);
    }
    return channel;
  }

  private async deliver(
    channel: NotificationChannel,
    notification: Notification,
  ): Promise<NotificationDelivery> {
    const delivery = this.deliveriesRepository.create({
      notificationId: notification.id,
      channel: channel.name,
      recipient: notification.recipient,
    });

    try {
      delivery.details = await channel.send(toMessage(notification));
      delivery.status = 'sent';
      delivery.error = null;
    } catch (error) {
      delivery.details = {};
      delivery.status = 'failed';
      delivery.error = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Delivery of notification ${notification.id} through "${channel.name}" failed`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return this.deliveriesRepository.save(delivery);
  }
}
