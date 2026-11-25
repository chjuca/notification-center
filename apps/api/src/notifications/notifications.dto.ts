import { z } from 'zod';
import {
  DELIVERY_STATUSES,
  type NotificationDelivery,
} from './notification-delivery.entity.js';
import type { Notification } from './notification.entity.js';

export const createNotificationSchema = z.object({
  title: z.string().trim().min(1).max(200).meta({ example: 'Welcome' }),
  content: z
    .string()
    .trim()
    .min(1)
    .max(10_000)
    .meta({ example: 'Thanks for signing up.' }),
  channel: z.string().trim().min(1).max(32).meta({
    description: 'Name of a registered channel, such as email, sms or push',
    example: 'email',
  }),
  recipient: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .meta({
      description:
        'Destination, in the format of the channel: an email address, ' +
        'a phone number like +56912345678, or a device token',
      example: 'ana@example.com',
    }),
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

export const deliveryResponseSchema = z.object({
  id: z.uuid(),
  channel: z.string().meta({ example: 'email' }),
  recipient: z.string().meta({ example: 'ana@example.com' }),
  status: z.enum(DELIVERY_STATUSES),
  details: z.record(z.string(), z.unknown()).meta({
    description: 'What the channel sent. Its shape depends on the channel',
  }),
  error: z
    .string()
    .nullable()
    .meta({ description: 'Why the delivery failed, when it did' }),
  createdAt: z.iso.datetime(),
});

export type DeliveryResponse = z.infer<typeof deliveryResponseSchema>;

export const notificationResponseSchema = z.object({
  id: z.uuid(),
  title: z.string().meta({ example: 'Welcome' }),
  content: z.string().meta({ example: 'Thanks for signing up.' }),
  channel: z.string().meta({ example: 'email' }),
  recipient: z.string().meta({ example: 'ana@example.com' }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deliveries: z.array(deliveryResponseSchema),
});

export type NotificationResponse = z.infer<typeof notificationResponseSchema>;

export const paginatedNotificationsSchema = z.object({
  items: z.array(notificationResponseSchema),
  total: z.number().int().meta({ example: 1 }),
  page: z.number().int().meta({ example: 1 }),
  limit: z.number().int().meta({ example: 20 }),
});

export type PaginatedNotifications = z.infer<
  typeof paginatedNotificationsSchema
>;

function toDeliveryResponse(delivery: NotificationDelivery): DeliveryResponse {
  return {
    id: delivery.id,
    channel: delivery.channel,
    recipient: delivery.recipient,
    status: delivery.status,
    details: delivery.details,
    error: delivery.error,
    createdAt: delivery.createdAt.toISOString(),
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
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
    deliveries: notification.deliveries.map(toDeliveryResponse),
  };
}
