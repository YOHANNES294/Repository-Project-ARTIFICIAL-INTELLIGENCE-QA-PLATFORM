import crypto from 'node:crypto';

// Master key for AES-256-GCM encryption of provider API keys
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_MASTER_KEY || 'default_ai_qa_master_key_32_bytes_len!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt sensitive plain text (e.g. API keys) returning separate components for Prisma columns
 */
export function encryptApiKeyComponents(plainKey: string): {
  ciphertext: string;
  iv: string;
  tag: string;
} {
  if (!plainKey) return { ciphertext: '', iv: '', tag: '' };
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  
  let ciphertext = cipher.update(plainKey, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt using separate DB columns: ciphertext, iv, tag
 */
export function decryptApiKeyComponents(
  ciphertext: string,
  ivHex: string,
  tagHex: string
): string {
  if (!ciphertext || !ivHex || !tagHex) return '';
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
  
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt sensitive plain text (e.g. API keys) using AES-256-GCM
 * Returns formatted string: iv:authTag:ciphertext
 */
export function encryptApiKey(plainKey: string): string {
  const { ciphertext, iv, tag } = encryptApiKeyComponents(plainKey);
  return `${iv}:${tag}:${ciphertext}`;
}

/**
 * Decrypt AES-256-GCM formatted string: iv:authTag:ciphertext
 */
export function decryptApiKey(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted API key format');
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  return decryptApiKeyComponents(ciphertextHex, ivHex, tagHex);
}

/**
 * Mask API key for UI display and safe logging (e.g. sk-abc...xyz)
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) {
    return '****';
  }
  const prefix = key.slice(0, 4);
  const suffix = key.slice(-4);
  return `${prefix}${'*'.repeat(Math.max(4, key.length - 8))}${suffix}`;
}
