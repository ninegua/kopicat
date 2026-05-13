const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
export const PASSWORD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@$&*-:';

export function generatePassword(byteCount = 8): string {
  const chars = PASSWORD_CHARSET;
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  let result = '';
  for (const byte of bytes) {
    result += chars[byte % chars.length];
  }
  return result;
}

async function deriveCryptoKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordBuffer = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(text: string, password: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const key = await deriveCryptoKey(password, salt);
  const plaintext = new TextEncoder().encode(text);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const blob = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertext.byteLength);
  blob.set(salt, 0);
  blob.set(iv, SALT_BYTES);
  blob.set(new Uint8Array(ciphertext), SALT_BYTES + IV_BYTES);

  return blob;
}

export async function decrypt(blob: Uint8Array, password: string): Promise<string> {
  if (blob.length < SALT_BYTES + IV_BYTES) {
    throw new Error('Decryption failed.');
  }

  const salt = blob.slice(0, SALT_BYTES);
  const iv = blob.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = blob.slice(SALT_BYTES + IV_BYTES);

  const key = await deriveCryptoKey(password, salt);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

  return new TextDecoder().decode(plaintext);
}
