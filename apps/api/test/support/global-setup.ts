import pg from 'pg';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../../src/database/typeorm.config.js';
import { TEST_ENV } from './test-env.js';

async function createDatabaseIfMissing(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const database = url.pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/.test(database)) {
    throw new Error(
      `Refusing to run the tests against "${database}": the database name must end in "_test"`,
    );
  }

  url.pathname = '/postgres';
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${database}"`);
    }
  } finally {
    await client.end();
  }
}

async function runMigrations(databaseUrl: string): Promise<void> {
  const dataSource = new DataSource(buildDataSourceOptions(databaseUrl));
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}

export default async function setup(): Promise<void> {
  await createDatabaseIfMissing(TEST_ENV.DATABASE_URL);
  await runMigrations(TEST_ENV.DATABASE_URL);
}
