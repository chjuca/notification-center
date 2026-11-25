import { Module } from '@nestjs/common';
import { ChannelRegistry } from './channel-registry.js';
import { EmailChannel } from './email.channel.js';
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from './notification-channel.js';
import { PushChannel } from './push.channel.js';
import { SmsChannel } from './sms.channel.js';

const CHANNELS = [EmailChannel, SmsChannel, PushChannel];

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
