import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type {
  ChannelMessage,
  DeliveryDetails,
  NotificationChannel,
} from './notification-channel.js';

const emailSchema = z.email();

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

function renderTemplate(title: string, content: string): string {
  return [
    '<!doctype html>',
    '<html>',
    '  <body>',
    `    <h1>${escapeHtml(title)}</h1>`,
    `    <p>${escapeHtml(content).replaceAll('\n', '<br>')}</p>`,
    '  </body>',
    '</html>',
  ].join('\n');
}

@Injectable()
export class EmailChannel implements NotificationChannel {
  readonly name = 'email';

  validate({ recipient }: ChannelMessage): string[] {
    return emailSchema.safeParse(recipient).success
      ? []
      : ['recipient must be a valid email address'];
  }

  send({ title, content }: ChannelMessage): Promise<DeliveryDetails> {
    return Promise.resolve({
      subject: title,
      html: renderTemplate(title, content),
    });
  }
}
