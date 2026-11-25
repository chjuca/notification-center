import type { DataSourceOptions } from 'typeorm';
import { NotificationDelivery } from '../notifications/notification-delivery.entity.js';
import { Notification } from '../notifications/notification.entity.js';
import { User } from '../users/user.entity.js';
import { MIGRATIONS } from './migrations/index.js';

export function buildDataSourceOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [User, Notification, NotificationDelivery],
    migrations: MIGRATIONS,
    synchronize: false,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  };
}
