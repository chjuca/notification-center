import { Module } from '@nestjs/common';
import { ChannelRegistry } from './channel-registry.js';
import { EmailChannel } from './email.channel.js';
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from './notification-channel.js';

const CHANNELS = [EmailChannel];

@Module({
  providers: [
    ...CHANNELS,
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (...channels: NotificationChannel[]) => channels,
      inject: CHANNELS,
    },
    ChannelRegistry,
  ],
  exports: [ChannelRegistry],
})
export class ChannelsModule {}
