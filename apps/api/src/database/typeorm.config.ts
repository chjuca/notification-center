import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { NotificationDelivery } from '../notifications/notification-delivery.entity.js';
import { Notification } from '../notifications/notification.entity.js';
import { User } from '../users/user.entity.js';

export function buildDataSourceOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [User, Notification, NotificationDelivery],
    migrations: [join(import.meta.dirname, 'migrations', '*.js')],
    synchronize: false,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  };
}
