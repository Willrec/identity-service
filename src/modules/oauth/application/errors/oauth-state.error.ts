import { AppError } from '../../../../shared/errors/AppError.js';

export class OAuthStateError extends AppError {
  constructor(message: string, code = 'OAUTH_STATE_ERROR') {
    super(message, 400, code);
  }
}
