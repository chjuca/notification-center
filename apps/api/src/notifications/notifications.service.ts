import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity.js';
import type {
  CreateNotificationDto,
  ListNotificationsQuery,
  UpdateNotificationDto,
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
    return this.notificationsRepository.save(notification);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.notificationsRepository.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException('Notification not found');
    }
  }
}
