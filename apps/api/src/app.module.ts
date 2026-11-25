import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { envSchema, type Env } from './config/env.js';
import { RateLimitGuard } from './common/rate-limit.guard.js';
import { buildDataSourceOptions } from './database/typeorm.config.js';
import { HealthModule } from './health/health.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...buildDataSourceOptions(config.get('DATABASE_URL', { infer: true })),
        migrationsRun: true,
      }),
    }),
    UsersModule,
    AuthModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() },
    RateLimitGuard,
    { provide: APP_GUARD, useExisting: RateLimitGuard },
  ],
})
export class AppModule {}
