import type { IOAuthHttpClient } from '../../application/contracts/oauth-http-client.interface.js';
import { OAuthHttpError } from '../../application/errors/oauth-http.error.js';
import { env } from '../../../../config/env.js';

/**
 * FetchOAuthHttpClient
 *
 * Concrete implementation of IOAuthHttpClient using the native Fetch API.
 * Configured with central timeout limits to protect outbound network calls.
 */
export class FetchOAuthHttpClient implements IOAuthHttpClient {
  /**
   * postForm
   *
   * Submits a form URL-encoded POST request with configured abort timeouts.
   */
  async postForm<T>(url: string, data: Record<string, string>): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data),
        signal: AbortSignal.timeout(env.OAUTH_HTTP_TIMEOUT_MS),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new OAuthHttpError(
          response.status,
          response.statusText,
          body
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new OAuthHttpError(
          408,
          'Request Timeout',
          `Request to ${url} timed out after ${env.OAUTH_HTTP_TIMEOUT_MS}ms`
        );
      }
      throw error;
    }
  }

  /**
   * get
   *
   * Executes a GET request with authorization/headers and configured abort timeouts.
   */
  async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    try {
      const options: RequestInit = {
        method: 'GET',
        signal: AbortSignal.timeout(env.OAUTH_HTTP_TIMEOUT_MS),
      };
      if (headers) {
        options.headers = headers;
      }
      const response = await fetch(url, options);

      if (!response.ok) {
        const body = await response.text();
        throw new OAuthHttpError(
          response.status,
          response.statusText,
          body
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new OAuthHttpError(
          408,
          'Request Timeout',
          `Request to ${url} timed out after ${env.OAUTH_HTTP_TIMEOUT_MS}ms`
        );
      }
      throw error;
    }
  }
}
