import { Test } from '@nestjs/testing';
import { ChannelRegistry } from './channel-registry.js';
import { ChannelsModule } from './channels.module.js';
import { EmailChannel } from './email.channel.js';
import type { NotificationChannel } from './notification-channel.js';

function fakeChannel(name: string): NotificationChannel {
  return {
    name,
    validate: () => [],
    send: () => Promise.resolve({}),
  };
}

describe('ChannelRegistry', () => {
  it('finds a channel by its name', () => {
    const sms = fakeChannel('sms');
    const registry = new ChannelRegistry([fakeChannel('email'), sms]);

    expect(registry.find('sms')).toBe(sms);
  });

  it('returns undefined for a name nobody registered', () => {
    const registry = new ChannelRegistry([fakeChannel('email')]);

    expect(registry.find('fax')).toBeUndefined();
  });

  it('lists the registered names', () => {
    const registry = new ChannelRegistry([
      fakeChannel('email'),
      fakeChannel('sms'),
    ]);

    expect(registry.names()).toEqual(['email', 'sms']);
  });

  it('refuses two channels with the same name', () => {
    expect(
      () => new ChannelRegistry([fakeChannel('email'), fakeChannel('email')]),
    ).toThrow('Duplicate notification channel: email');
  });

  it('receives the channels declared in ChannelsModule', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ChannelsModule],
    }).compile();
    const registry = moduleRef.get(ChannelRegistry);

    expect(registry.find('email')).toBeInstanceOf(EmailChannel);
  });
});
