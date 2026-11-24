import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { envSchema, type Env } from './config/env.js';
import { buildDataSourceOptions } from './database/typeorm.config.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildDataSourceOptions(config.get('DATABASE_URL', { infer: true })),
    }),
    UsersModule,
    AuthModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() },
  ],
})
export class AppModule {}
