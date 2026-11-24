import type { DataSourceOptions } from 'typeorm';

export function buildDataSourceOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [],
    synchronize: false,
  };
}
