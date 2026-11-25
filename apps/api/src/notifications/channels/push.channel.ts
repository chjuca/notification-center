import { Injectable } from '@nestjs/common';
import type {
  ChannelMessage,
  DeliveryDetails,
  NotificationChannel,
} from './notification-channel.js';

const DEVICE_TOKEN_PATTERN = /^[A-Za-z0-9_\-:.]{32,512}$/;

@Injectable()
export class PushChannel implements NotificationChannel {
  readonly name = 'push';

  validate({ recipient }: ChannelMessage): string[] {
    return DEVICE_TOKEN_PATTERN.test(recipient)
      ? []
      : ['recipient must be a valid device token'];
  }

  send({
    title,
    content,
    recipient,
  }: ChannelMessage): Promise<DeliveryDetails> {
    return Promise.resolve({
      payload: {
        token: recipient,
        notification: { title, body: content },
      },
    });
  }
}
