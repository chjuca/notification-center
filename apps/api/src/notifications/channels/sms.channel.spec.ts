import { SmsChannel } from './sms.channel.js';

describe('SmsChannel', () => {
  const channel = new SmsChannel();
  const message = {
    title: 'Code',
    content: 'Your code is 1234',
    recipient: '+56912345678',
  };

  it('is registered under the name "sms"', () => {
    expect(channel.name).toBe('sms');
  });

  describe('validate', () => {
    it('accepts a phone number in international format', () => {
      expect(channel.validate(message)).toEqual([]);
    });

    it.each([
      '56912345678',
      '+0912345678',
      '+569 1234 5678',
      '+1234567',
      '+1234567890123456',
      'ana@example.com',
    ])('rejects %j as recipient', (recipient) => {
      expect(channel.validate({ ...message, recipient })).toHaveLength(1);
    });
  });

  describe('send', () => {
    it('sends the title and the content to the phone number', async () => {
      const details = await channel.send(message);

      expect(details).toEqual({
        to: '+56912345678',
        text: 'Code: Your code is 1234',
        truncated: false,
        originalLength: 23,
      });
    });

    it('keeps a text of exactly 160 characters whole', async () => {
      const details = await channel.send({
        ...message,
        title: 'A',
        content: 'x'.repeat(157),
      });

      expect(details.text).toHaveLength(160);
      expect(details.truncated).toBe(false);
    });

    it('cuts a longer text at 160 characters and records it', async () => {
      const details = await channel.send({
        ...message,
        title: 'A',
        content: 'x'.repeat(500),
      });

      expect(details.text).toBe(`A: ${'x'.repeat(157)}`);
      expect(details.truncated).toBe(true);
      expect(details.originalLength).toBe(503);
    });

    it('does not split an emoji when cutting', async () => {
      const details = await channel.send({
        ...message,
        title: 'A',
        content: '😀'.repeat(200),
      });

      expect(details.text).toBe(`A: ${'😀'.repeat(157)}`);
    });
  });
});
