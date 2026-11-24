export interface ChannelMessage {
  title: string;
  content: string;
  recipient: string;
}

export type DeliveryDetails = Record<string, unknown>;

export interface NotificationChannel {
  readonly name: string;
  validate(message: ChannelMessage): string[];
  send(message: ChannelMessage): Promise<DeliveryDetails>;
}

export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');
