import jwt, { type SignOptions, type VerifyOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface TokenPayload {
  sub: string;
  email: string;
  status: string;
}

export class TokenService {
  private readonly privateKey: string;
  private readonly publicKey: string;

  private readonly issuer = 'identity-service-api';
  private readonly audience = 'identity-client';

  constructor() {
    // Replace escaped newlines from environment variables
    this.privateKey = env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
    this.publicKey = env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
  }

  /**
   * Generates a signed JWT access token using RS256.
   * @param user The user object containing id, email, and status.
   * @returns The signed JWT string.
   */
  signAccessToken(user: { id: string; email: string; status: string }): string {
    const payload: Omit<TokenPayload, 'sub'> = {
      email: user.email,
      status: user.status,
    };

    const options: SignOptions = {
      algorithm: 'RS256',
      subject: user.id,
      expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN as Exclude<SignOptions['expiresIn'], undefined>,
      issuer: this.issuer,
      audience: this.audience,
    };

    return jwt.sign(payload, this.privateKey, options);
  }

  /**
   * Verifies a JWT access token using the public key and RS256 algorithm.
   * Validates the issuer and audience.
   * @param token The JWT string to verify.
   * @returns The decoded token payload.
   * @throws Will throw if the token is invalid, expired, or has an invalid issuer/audience.
   */
  verifyAccessToken(token: string): TokenPayload {
    const options: VerifyOptions = {
      algorithms: ['RS256'],
      issuer: this.issuer,
      audience: this.audience,
    };

    const decoded = jwt.verify(token, this.publicKey, options) as jwt.JwtPayload & TokenPayload;

    return {
      sub: decoded.sub,
      email: decoded.email,
      status: decoded.status,
    };
  }
}
