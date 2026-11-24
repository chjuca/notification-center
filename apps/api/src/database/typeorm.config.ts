import type { DataSourceOptions } from 'typeorm';
import { User } from '../users/user.entity.js';

export function buildDataSourceOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [User],
    synchronize: false,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  };
}
