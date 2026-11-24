import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity.js';
import type {
  CreateNotificationDto,
  ListNotificationsQuery,
} from './notifications.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  create(userId: string, dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      ...dto,
      userId,
    });
    return this.notificationsRepository.save(notification);
  }

  async findAllForUser(
    userId: string,
    { page, limit }: ListNotificationsQuery,
  ): Promise<{ items: Notification[]; total: number }> {
    const [items, total] = await this.notificationsRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }
}
