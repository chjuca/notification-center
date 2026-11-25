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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ApiErrorResponse } from '../common/api-error-response.js';
import {
  createNotificationSchema,
  listNotificationsQuerySchema,
  notificationIdSchema,
  notificationResponseSchema,
  paginatedNotificationsSchema,
  toNotificationResponse,
  updateNotificationSchema,
  type CreateNotificationDto,
  type ListNotificationsQuery,
  type NotificationResponse,
  type PaginatedNotifications,
  type UpdateNotificationDto,
} from './notifications.dto.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('notifications')
@ApiBearerAuth()
@ApiErrorResponse(401, 'Missing, invalid or expired access token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a notification and send it through its channel',
  })
  @ApiCreatedResponse({
    description:
      'Created. `deliveries` tells whether the send succeeded or failed',
    standardSchema: notificationResponseSchema,
  })
  @ApiErrorResponse(
    400,
    'Invalid body, unknown channel, or recipient not valid for the channel',
  )
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: createNotificationSchema }) dto: CreateNotificationDto,
  ): Promise<NotificationResponse> {
    const notification = await this.notificationsService.create(user.id, dto);
    return toNotificationResponse(notification);
  }

  @Get()
  @ApiOperation({ summary: 'List your notifications, newest first' })
  @ApiOkResponse({ standardSchema: paginatedNotificationsSchema })
  @ApiErrorResponse(400, 'Invalid page or limit')
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
  @ApiOperation({
    summary: 'Change one of your notifications. It is not sent again',
  })
  @ApiOkResponse({ standardSchema: notificationResponseSchema })
  @ApiErrorResponse(
    400,
    'Invalid id or body, or the result is not valid for its channel',
  )
  @ApiErrorResponse(404, 'Not found, or it belongs to another user')
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
  @ApiOperation({ summary: 'Delete one of your notifications' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiErrorResponse(400, 'Invalid id')
  @ApiErrorResponse(404, 'Not found, or it belongs to another user')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', { schema: notificationIdSchema }) id: string,
  ): Promise<void> {
    await this.notificationsService.remove(user.id, id);
  }
}
