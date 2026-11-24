import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import {
  createNotificationSchema,
  listNotificationsQuerySchema,
  toNotificationResponse,
  type CreateNotificationDto,
  type ListNotificationsQuery,
  type NotificationResponse,
  type PaginatedNotifications,
} from './notifications.dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: createNotificationSchema }) dto: CreateNotificationDto,
  ): Promise<NotificationResponse> {
    const notification = await this.notificationsService.create(user.id, dto);
    return toNotificationResponse(notification);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query({ schema: listNotificationsQuerySchema })
    query: ListNotificationsQuery,
  ): Promise<PaginatedNotifications> {
    const { items, total } = await this.notificationsService.findAllForUser(
      user.id,
      query,
    );
    return {
      items: items.map(toNotificationResponse),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
