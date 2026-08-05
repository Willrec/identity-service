/**
 * OAuthHttpError
 *
 * Represents outbound HTTP request errors encountered during provider calls.
 * Inherits from Error to comply with strict throw rules.
 */
export class OAuthHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string
  ) {
    super(`HTTP Error: ${statusText} (${status}) - ${body}`);
    this.name = 'OAuthHttpError';
  }
}
