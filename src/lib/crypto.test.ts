import { describe, it, expect } from 'vitest';
import { generatePassword, encrypt, decrypt } from './crypto';

describe('generatePassword', () => {
  it('returns a string of exactly 8 characters', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword();
      expect(pw).toHaveLength(8);
    }
  });

  it('only contains allowed characters', () => {
    const allowed = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword();
      for (const char of pw) {
        expect(allowed).toContain(char);
      }
    }
  });

  it('returns different passwords on each call', () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 100; i++) {
      passwords.add(generatePassword());
    }
    expect(passwords.size).toBeGreaterThan(50);
  });

  it('generates passwords with custom length', () => {
    for (const length of [4, 11, 32]) {
      const pw = generatePassword(length);
      expect(pw).toHaveLength(length);
    }
  });

  it('custom length passwords only contain allowed characters', () => {
    const allowed = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
    const pw = generatePassword(16);
    for (const char of pw) {
      expect(allowed).toContain(char);
    }
  });
});

describe('encrypt / decrypt roundtrip', () => {
  it('encrypts and decrypts a simple string', async () => {
    const password = 'TestPass1!';
    const text = 'Hello, World!';
    const encrypted = await encrypt(text, password);
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(text);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(text);
  });

  it('encrypts and decrypts an empty string', async () => {
    const password = 'MyPass1!';
    const text = '';
    const encrypted = await encrypt(text, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(text);
  });

  it('encrypts and decrypts a long string', async () => {
    const password = 'Secure#1';
    const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '
      + 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '
      + 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris '
      + 'nisi ut aliquip ex ea commodo consequat.';
    const encrypted = await encrypt(text, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(text);
  });

  it('encrypts and decrypts Unicode text', async () => {
    const password = 'Uni#Pass';
    const text = 'こんにちは世界 🌍 Привет мир مرحبا بالعالم';
    const encrypted = await encrypt(text, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(text);
  });

  it('decrypting with wrong password throws', async () => {
    const password = 'Correct1!';
    const wrongPassword = 'WrongPass';
    const text = 'Secret message';
    const encrypted = await encrypt(text, password);
    await expect(decrypt(encrypted, wrongPassword)).rejects.toThrow();
  });

  it('produces different ciphertext for the same plaintext', async () => {
    const password = 'SamePass1!';
    const text = 'Same text';
    const encrypted1 = await encrypt(text, password);
    const encrypted2 = await encrypt(text, password);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('decrypting invalid blob throws', async () => {
    const password = 'TestPass1!';
    await expect(decrypt('short', password)).rejects.toThrow('Invalid blob');
  });
});
