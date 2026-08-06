import { AppError } from '../../../../shared/errors/AppError.js';

export class OAuthProviderError extends AppError {
  constructor(message: string, code = 'OAUTH_PROVIDER_ERROR') {
    super(message, 502, code);
  }
}
