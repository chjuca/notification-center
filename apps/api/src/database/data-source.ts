import { DataSource } from 'typeorm';
import { envSchema } from '../config/env.js';
import { buildDataSourceOptions } from './typeorm.config.js';

const { DATABASE_URL } = envSchema.parse(process.env);

export default new DataSource(buildDataSourceOptions(DATABASE_URL));
