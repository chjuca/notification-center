import { Inject, Injectable } from '@nestjs/common';
import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from './notification-channel.js';

@Injectable()
export class ChannelRegistry {
  private readonly channels = new Map<string, NotificationChannel>();

  constructor(@Inject(NOTIFICATION_CHANNELS) channels: NotificationChannel[]) {
    for (const channel of channels) {
      if (this.channels.has(channel.name)) {
        throw new Error(`Duplicate notification channel: ${channel.name}`);
      }
      this.channels.set(channel.name, channel);
    }
  }

  find(name: string): NotificationChannel | undefined {
    return this.channels.get(name);
  }

  names(): string[] {
    return [...this.channels.keys()];
  }
}
