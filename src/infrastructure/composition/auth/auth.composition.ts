import { AuthService } from '../../../modules/auth/services/auth.service.js';
import { AuthRepository } from '../../../modules/auth/repositories/auth.repository.js';
import { PasswordService } from '../../../modules/auth/services/password.service.js';
import { TokenService } from '../../../modules/auth/services/token.service.js';
import { SessionService } from '../../../modules/auth/services/session.service.js';
import { UserService } from '../../../modules/users/services/user.service.js';
import { UserRepository } from '../../../modules/users/repositories/user.repository.js';
import { TokenService as JwtTokenService } from '../../security/jwt.js';
import { composeEmailModule } from '../email/email.composition.js';
import { AuthenticationPipelineService } from '../../../modules/auth/services/authentication-pipeline.service.js';
import { AuthController } from '../../../modules/auth/controllers/auth.controller.js';
import { prisma } from '../../database/prisma.js';

/**
 * composeAuthenticationPipelineService
 *
 * Instantiates and returns the shared session/token authentication pipeline service.
 */
export function composeAuthenticationPipelineService(): AuthenticationPipelineService {
  const authRepo = new AuthRepository(prisma);
  const sessionService = new SessionService(authRepo);
  const tokenService = new TokenService(authRepo);
  const jwtTokenService = new JwtTokenService();

  return new AuthenticationPipelineService(
    authRepo,
    sessionService,
    tokenService,
    jwtTokenService
  );
}

/**
 * composeAuthService
 *
 * Assembles and returns the fully configured AuthService instance.
 */
export function composeAuthService(): AuthService {
  const authRepo = new AuthRepository(prisma);
  const userRepo = new UserRepository(prisma);
  const passwordService = new PasswordService();
  const tokenService = new TokenService(authRepo);
  const sessionService = new SessionService(authRepo);
  const userService = new UserService(userRepo);
  const jwtTokenService = new JwtTokenService();
  const emailService = composeEmailModule();
  const authPipelineService = composeAuthenticationPipelineService();

  return new AuthService(
    authRepo,
    userService,
    passwordService,
    tokenService,
    sessionService,
    emailService,
    jwtTokenService,
    authPipelineService
  );
}

/**
 * composeAuthController
 *
 * Instantiates and returns the concrete AuthController with its dependencies wired up.
 */
export function composeAuthController(): AuthController {
  const authRepo = new AuthRepository(prisma);
  const tokenService = new TokenService(authRepo);
  const authService = composeAuthService();

  return new AuthController(authService, tokenService);
}
