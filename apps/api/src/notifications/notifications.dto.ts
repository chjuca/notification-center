import { z } from 'zod';
import type {
  DeliveryStatus,
  NotificationDelivery,
} from './notification-delivery.entity.js';
import type { Notification } from './notification.entity.js';

export const createNotificationSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(10_000),
  channel: z.string().trim().min(1).max(32),
  recipient: z.string().trim().min(1).max(512),
});

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;

export const updateNotificationSchema = createNotificationSchema
  .partial()
  .refine((dto) => Object.keys(dto).length > 0, {
    message: 'At least one field is required',
  });

export type UpdateNotificationDto = z.infer<typeof updateNotificationSchema>;

export const notificationIdSchema = z.uuid();

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListNotificationsQuery = z.infer<
  typeof listNotificationsQuerySchema
>;

export interface DeliveryResponse {
  id: string;
  channel: string;
  recipient: string;
  status: DeliveryStatus;
  details: Record<string, unknown>;
  error: string | null;
  createdAt: Date;
}

export interface NotificationResponse {
  id: string;
  title: string;
  content: string;
  channel: string;
  recipient: string;
  createdAt: Date;
  updatedAt: Date;
  deliveries: DeliveryResponse[];
}

export interface PaginatedNotifications {
  items: NotificationResponse[];
  total: number;
  page: number;
  limit: number;
}

function toDeliveryResponse(delivery: NotificationDelivery): DeliveryResponse {
  return {
    id: delivery.id,
    channel: delivery.channel,
    recipient: delivery.recipient,
    status: delivery.status,
    details: delivery.details,
    error: delivery.error,
    createdAt: delivery.createdAt,
  };
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
    deliveries: notification.deliveries.map(toDeliveryResponse),
  };
}
