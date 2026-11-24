import { z } from 'zod';
import type { Notification } from './notification.entity.js';

export const createNotificationSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(10_000),
  channel: z.string().trim().min(1).max(32),
  recipient: z.string().trim().min(1).max(512),
});

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;

export interface NotificationResponse {
  id: string;
  title: string;
  content: string;
  channel: string;
  recipient: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedNotifications {
  items: NotificationResponse[];
  total: number;
  page: number;
  limit: number;
}

export function toNotificationResponse(
  notification: Notification,
): NotificationResponse {
  return {
    id: notification.id,
    title: notification.title,
    content: notification.content,
    channel: notification.channel,
    recipient: notification.recipient,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}
