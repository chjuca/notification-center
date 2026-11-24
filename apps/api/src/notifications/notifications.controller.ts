import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import {
  createNotificationSchema,
  listNotificationsQuerySchema,
  notificationIdSchema,
  toNotificationResponse,
  updateNotificationSchema,
  type CreateNotificationDto,
  type ListNotificationsQuery,
  type NotificationResponse,
  type PaginatedNotifications,
  type UpdateNotificationDto,
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

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: notificationIdSchema }) id: string,
    @Body({ schema: updateNotificationSchema }) dto: UpdateNotificationDto,
  ): Promise<NotificationResponse> {
    const notification = await this.notificationsService.update(
      user.id,
      id,
      dto,
    );
    return toNotificationResponse(notification);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: notificationIdSchema }) id: string,
  ): Promise<void> {
    await this.notificationsService.remove(user.id, id);
  }
}
