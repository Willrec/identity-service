import { AppError } from '../../../../shared/errors/AppError.js';

export class OAuthConfigurationError extends AppError {
  constructor(message: string, code = 'OAUTH_CONFIGURATION_ERROR') {
    super(message, 500, code);
  }
}
