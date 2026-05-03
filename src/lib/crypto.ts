const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export function generatePassword(byteCount = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@$&*-:';
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

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    throw new Error('Invalid blob');
  }
}

export async function encrypt(text: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const key = await deriveCryptoKey(password, salt);
  const plaintext = new TextEncoder().encode(text);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const blob = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertext.byteLength);
  blob.set(salt, 0);
  blob.set(iv, SALT_BYTES);
  blob.set(new Uint8Array(ciphertext), SALT_BYTES + IV_BYTES);

  return toBase64(blob);
}

export async function decrypt(blobB64: string, password: string): Promise<string> {
  const blob = fromBase64(blobB64);

  if (blob.length < SALT_BYTES + IV_BYTES) {
    throw new Error('Invalid blob');
  }

  const salt = blob.slice(0, SALT_BYTES);
  const iv = blob.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = blob.slice(SALT_BYTES + IV_BYTES);

  const key = await deriveCryptoKey(password, salt);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

  return new TextDecoder().decode(plaintext);
}
