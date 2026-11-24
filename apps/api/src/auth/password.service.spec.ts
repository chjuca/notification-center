import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('produces an argon2id hash that does not contain the password', async () => {
    const hash = await service.hash('plain-password');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('plain-password');
  });

  it('produces a different hash each time for the same password', async () => {
    const [first, second] = await Promise.all([
      service.hash('plain-password'),
      service.hash('plain-password'),
    ]);

    expect(first).not.toBe(second);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await service.hash('plain-password');

    expect(await service.verify(hash, 'plain-password')).toBe(true);
    expect(await service.verify(hash, 'other-password')).toBe(false);
  });
});
