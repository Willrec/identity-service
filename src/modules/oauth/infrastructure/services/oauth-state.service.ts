import crypto from 'node:crypto';

/**
 * OAuthStateService
 *
 * Cryptographic state generator.
 * Produces secure, cryptographically random, URL-safe states to protect
 * authorization flows against CSRF attacks.
 */
export class OAuthStateService {
  /**
   * generateState
   *
   * Generates a high-entropy cryptographically secure random state.
   * Format: URL-safe base64 string.
   */
  generateState(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
}
