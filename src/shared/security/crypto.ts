import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes IV is standard for GCM

/**
 * encrypt
 *
 * Encrypts a plaintext string using AES-256-GCM.
 * The derived key is generated via SHA-256 hash of the provided secret key.
 * Returns a colon-separated string: "iv:authTag:encryptedPayload".
 */
export function encrypt(text: string, secretKey: string): string {
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * decrypt
 *
 * Decrypts a colon-separated cipher string ("iv:authTag:encryptedPayload")
 * using AES-256-GCM and the provided secret key.
 */
export function decrypt(encryptedText: string, secretKey: string): string {
  const parts = encryptedText.split(':');
  const ivHex = parts[0];
  const authTagHex = parts[1];
  const encryptedPayload = parts[2];

  if (!ivHex || !authTagHex || !encryptedPayload) {
    throw new Error('Invalid cipher text format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const key = crypto.createHash('sha256').update(secretKey).digest();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = decipher.update(encryptedPayload, 'hex', 'utf8') + decipher.final('utf8');
  return decrypted;
}
