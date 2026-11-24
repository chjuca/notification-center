import { EmailChannel } from './email.channel.js';

describe('EmailChannel', () => {
  const channel = new EmailChannel();
  const message = {
    title: 'Welcome',
    content: 'Hello there',
    recipient: 'ana@example.com',
  };

  it('is registered under the name "email"', () => {
    expect(channel.name).toBe('email');
  });

  describe('validate', () => {
    it('accepts a valid email address', () => {
      expect(channel.validate(message)).toEqual([]);
    });

    it.each(['ana', 'ana@', '@example.com', '+56912345678', 'a b@example.com'])(
      'rejects %j as recipient',
      (recipient) => {
        expect(channel.validate({ ...message, recipient })).toEqual([
          'recipient must be a valid email address',
        ]);
      },
    );
  });

  describe('send', () => {
    it('uses the title as subject and renders the template', async () => {
      const details = await channel.send(message);

      expect(details.subject).toBe('Welcome');
      expect(details.html).toContain('<h1>Welcome</h1>');
      expect(details.html).toContain('<p>Hello there</p>');
    });

    it('escapes html in the title and the content', async () => {
      const details = await channel.send({
        ...message,
        title: '<script>alert(1)</script>',
        content: 'Tom & "Jerry"',
      });

      expect(details.html).toContain(
        '<h1>&lt;script&gt;alert(1)&lt;/script&gt;</h1>',
      );
      expect(details.html).toContain('<p>Tom &amp; &quot;Jerry&quot;</p>');
      expect(details.html).not.toContain('<script>');
    });

    it('turns line breaks into <br>', async () => {
      const details = await channel.send({
        ...message,
        content: 'Line one\nLine two',
      });

      expect(details.html).toContain('<p>Line one<br>Line two</p>');
    });
  });
});
