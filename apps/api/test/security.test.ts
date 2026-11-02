import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  hashToken,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../src/utils/security.js';
import { OrganizationRole } from '@ai-qa/shared-types';

describe('Security & Cryptography Utilities', () => {
  it('hashes passwords using Argon2id and verifies correctly', async () => {
    const password = 'SuperSecretPassword123!';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).toContain('$argon2id$');

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongPassword', hash);
    expect(isInvalid).toBe(false);
  });

  it('generates secure random tokens and deterministic SHA-256 hashes', () => {
    const token1 = generateRandomToken();
    const token2 = generateRandomToken();

    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64); // 32 bytes hex

    const hash1 = hashToken(token1);
    const hash2 = hashToken(token1);
    expect(hash1).toBe(hash2); // deterministic
    expect(hash1).not.toBe(token1); // one-way
  });

  it('signs and verifies JWT access tokens with organization context', () => {
    const payload = {
      sub: 'user-uuid-123',
      email: 'tester@acme.com',
      orgId: 'org-uuid-456',
      role: OrganizationRole.QA_MANAGER,
    };

    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const verified = verifyAccessToken(token);
    expect(verified.sub).toBe(payload.sub);
    expect(verified.email).toBe(payload.email);
    expect(verified.orgId).toBe(payload.orgId);
    expect(verified.role).toBe(OrganizationRole.QA_MANAGER);
  });

  it('signs and verifies JWT refresh tokens with family tracking', () => {
    const payload = {
      sub: 'user-uuid-123',
      familyId: 'family-uuid-789',
      orgId: 'org-uuid-456',
    };

    const token = generateRefreshToken(payload);
    expect(typeof token).toBe('string');

    const verified = verifyRefreshToken(token);
    expect(verified.sub).toBe(payload.sub);
    expect(verified.familyId).toBe(payload.familyId);
  });
});
