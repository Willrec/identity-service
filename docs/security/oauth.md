# Security Architecture — OAuth Federated Authentication

This document details the security mitigations, cryptographic parameters, and architectural design choices implemented in the Identity Service federated authentication module.

---

## 1. Authorization Code Flow with PKCE (RFC 7636)

To prevent authorization code interception attacks on public or hybrid client channels, the OAuth module enforces **PKCE (Proof Key for Code Exchange)** for all providers:

1. **Code Verifier**: During authorization initiation, the application generates a cryptographically random, high-entropy string `code_verifier` (minimum 43 characters, using characters `[A-Z]`, `[a-z]`, `[0-9]`, `-`, `.`, `_`, `~`).
2. **Code Challenge**: The service hashes the verifier using SHA-256 and base64url-encodes the result:
   $$\text{challenge} = \text{BASE64URL-ENCODE}(\text{SHA256}(\text{ASCII}(\text{verifier})))$$
3. **Validation**: The challenge is sent to Google, and the original verifier is stored securely in an encrypted, HTTP-only cookie. During the callback exchange, the verifier is sent back to the provider, which validates it against the original challenge.

---

## 2. CSRF Mitigation via Cryptographic State Parameter

To protect users against Cross-Site Request Forgery (CSRF) login hijacking, the flow mandates a cryptographically secure `state` parameter:

- A 32-byte cryptographically secure random value is generated on authorization initiation.
- The value is sent to Google and simultaneously encrypted in the client cookie.
- During the callback, the `state` query parameter must exactly match the decrypted cookie state, or the request is immediately rejected.

---

## 3. Replay Attack Prevention

To guarantee that authorization codes and flow state cookies are consumed exactly once, the HTTP controller implements **One-Time Consumption Replay Protection**:

- In `callbackGoogle`, the `flowStore.clear(res)` instruction is executed **immediately** after reading and verifying the cookie value, and before making the network token exchange.
- If the token exchange fails, the cookie remains deleted.
- If a client attempts to execute the callback endpoint a second time using the same query parameters, it fails immediately with a `400 Bad Request` because the session cookie no longer exists.

---

## 4. Anti-Takeover & Account Hijacking Prevention

To prevent malicious account takeovers where an attacker registers a target user's email at an unverified external identity provider and logs in via OAuth:

1. **Email Verification Requirement**: Automatic linking of federated OAuth accounts to pre-existing local users is **only** permitted if `context.emailVerified === true`.
2. **Untrusted Provider Blocking**: If the OAuth provider does not guarantee verified email ownership, the callback is rejected with a `403 Forbidden` (`EMAIL_UNVERIFIED`).

---

## 5. Session and Cookie Strategy

- **HTTP-Only & Secure Cookies**: All refresh tokens (`__Host-refresh`) and temporary OAuth session cookies (`__Host-oauth-session`) are configured with:
  - `HttpOnly`: Prevents client-side script access, blocking XSS-based session hijacking.
  - `Secure`: Ensures cookies are only sent over TLS encrypted connections.
  - `SameSite=Lax`: Restricts cookie propagation on cross-site requests while preserving standard navigation.
  - `Path=/`: Restricts scope to the application base.
- **Symmetric Encryption**: The temporary flow state cookie is symmetrically encrypted using AES-256-GCM. The key is sourced from the validated `OAUTH_COOKIE_SECRET` environment variable.

---

## 6. Database Transaction Boundaries

All account linking, user provisioning, role assignments, and audit logs occur within a single database transaction boundary (`prisma.$transaction`).

- No external HTTP network requests (such as exchanging codes or loading provider profiles) occur inside the database transaction.
- If user creation or account binding throws an exception, the entire transaction is rolled back, preventing orphaned users or incomplete audit histories.
