/**
 * OAuthDuplicateEmailError
 *
 * Domain-specific exception thrown when a user email registration collides
 * with an existing record in the persistence layer.
 */
export class OAuthDuplicateEmailError extends Error {
  constructor(
    public readonly email: string,
    message = `Email "${email}" is already registered.`
  ) {
    super(message);
    this.name = 'OAuthDuplicateEmailError';
  }
}
