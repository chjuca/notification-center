import { Injectable } from '@nestjs/common';
import type {
  ChannelMessage,
  DeliveryDetails,
  NotificationChannel,
} from './notification-channel.js';

const PHONE_NUMBER_PATTERN = /^\+[1-9]\d{7,14}$/;
const MAX_LENGTH = 160;

@Injectable()
export class SmsChannel implements NotificationChannel {
  readonly name = 'sms';

  validate({ recipient }: ChannelMessage): string[] {
    return PHONE_NUMBER_PATTERN.test(recipient)
      ? []
      : [
          'recipient must be a phone number in international format, like +56912345678',
        ];
  }

  send({
    title,
    content,
    recipient,
  }: ChannelMessage): Promise<DeliveryDetails> {
    const characters = Array.from(`${title}: ${content}`);

    return Promise.resolve({
      to: recipient,
      text: characters.slice(0, MAX_LENGTH).join(''),
      truncated: characters.length > MAX_LENGTH,
      originalLength: characters.length,
    });
  }
}
