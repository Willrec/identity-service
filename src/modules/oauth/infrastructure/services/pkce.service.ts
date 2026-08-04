import crypto from 'node:crypto';

/**
 * PkceService
 *
 * Generic cryptographic helper utility implementing PKCE (RFC 7636).
 * This service is provider-agnostic and maintains zero awareness of specific
 * OAuth endpoints, callback handling, or state logic.
 */
export class PkceService {
  /**
   * generateVerifier
   *
   * Generates a cryptographically secure random code verifier.
   * Format: URL-safe base64 string using unreserved characters [A-Z], [a-z], [0-9], "-", ".", "_", "~".
   * Length is 43 characters (32 bytes of entropy base64url encoded).
   */
  generateVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * generateChallenge
   *
   * Derives a code challenge from the code verifier using the S256 (SHA-256) method.
   * Format: Base64URL-encoded SHA-256 hash.
   */
  generateChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return hash.toString('base64url');
  }
}
