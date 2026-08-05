import crypto from 'node:crypto';
import type { IOAuthStateService } from '../../application/contracts/oauth-state-service.interface.js';

/**
 * OAuthStateService
 *
 * Cryptographic state generator.
 * Produces secure, cryptographically random, URL-safe states to protect
 * authorization flows against CSRF attacks.
 */
export class OAuthStateService implements IOAuthStateService {
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
