import { PushChannel } from './push.channel.js';

describe('PushChannel', () => {
  const channel = new PushChannel();
  const token = 'dQw4w9WgXcQ:APA91bHun4MxP5egoKMwt2KZFBaFUH-1RYqx_abc.DEF';
  const message = {
    title: 'New message',
    content: 'You have one new message',
    recipient: token,
  };

  it('is registered under the name "push"', () => {
    expect(channel.name).toBe('push');
  });

  describe('validate', () => {
    it('accepts a device token', () => {
      expect(channel.validate(message)).toEqual([]);
    });

    it.each([
      'too-short',
      'a'.repeat(513),
      `${'a'.repeat(40)} with spaces`,
      `${'a'.repeat(40)}<script>`,
      'ana@example.com',
    ])('rejects %j as recipient', (recipient) => {
      expect(channel.validate({ ...message, recipient })).toEqual([
        'recipient must be a valid device token',
      ]);
    });
  });

  describe('send', () => {
    it('formats the payload for the device', async () => {
      const details = await channel.send(message);

      expect(details).toEqual({
        payload: {
          token,
          notification: {
            title: 'New message',
            body: 'You have one new message',
          },
        },
      });
    });
  });
});
