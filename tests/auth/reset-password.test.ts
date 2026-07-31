import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '../../src/infrastructure/database/prisma.js';
import { TokenService } from '../../src/modules/auth/services/token.service.js';
import { AuthRepository } from '../../src/modules/auth/repositories/auth.repository.js';
import { cleanupData, createVerifiedUser, resetPassword, login, authenticateClient } from '../setup/helpers.js';

const tokenService = new TokenService(new AuthRepository(prisma));

describe('POST /api/v1/auth/reset-password', () => {
  afterEach(async () => {
    await cleanupData();
  });

  it('resets password with valid token and revokes sessions', async () => {
    const { refreshCookie, csrfCookie, userPayload } = await authenticateClient();
    const user = await prisma.user.findUnique({ where: { email: userPayload.email } });
    
    // Create token
    const validToken = tokenService.generateOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user!.id,
        tokenHash: tokenService.hashToken(validToken),
        expiresAt: new Date(Date.now() + 100000),
      }
    });

    const res = await resetPassword(validToken, 'BrandNewPassword123!');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Old password should fail
    const oldLoginRes = await login(userPayload.email, userPayload.password);
    expect(oldLoginRes.res.status).toBe(401);

    // New password should succeed
    const newLoginRes = await login(userPayload.email, 'BrandNewPassword123!');
    expect(newLoginRes.res.status).toBe(200);

    // Existing sessions should be revoked
    const sessions = await prisma.session.findMany({ where: { userId: user!.id } });
    // The session created by authenticateClient should be revoked
    // The new session created by newLoginRes is valid
    expect(sessions.some(s => s.revoked === true)).toBe(true);

    const refreshTokens = await prisma.refreshToken.findMany({ where: { userId: user!.id } });
    expect(refreshTokens.some(t => t.revoked === true)).toBe(true);
  });

  it('rejects invalid token', async () => {
    const res = await resetPassword('invalid-token', 'BrandNewPassword123!');
    expect(res.status).toBe(400);
  });

  it('rejects expired token', async () => {
    const { payload } = await createVerifiedUser();
    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    
    const expiredToken = tokenService.generateOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user!.id,
        tokenHash: tokenService.hashToken(expiredToken),
        expiresAt: new Date(Date.now() - 100000),
      }
    });

    const res = await resetPassword(expiredToken, 'BrandNewPassword123!');
    expect(res.status).toBe(400);
  });

  it('rejects reused token', async () => {
    const { payload } = await createVerifiedUser();
    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    
    const validToken = tokenService.generateOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user!.id,
        tokenHash: tokenService.hashToken(validToken),
        expiresAt: new Date(Date.now() + 100000),
      }
    });

    await resetPassword(validToken, 'BrandNewPassword123!');
    const reusedRes = await resetPassword(validToken, 'AnotherPassword123!');
    expect(reusedRes.status).toBe(400);
  });
});
