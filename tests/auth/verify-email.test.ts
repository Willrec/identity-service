import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '../../src/infrastructure/database/prisma.js';
import { TokenService } from '../../src/modules/auth/services/token.service.js';
import { AuthRepository } from '../../src/modules/auth/repositories/auth.repository.js';
import { cleanupData, createUnverifiedUser, createVerifiedUser, verifyEmail } from '../setup/helpers.js';

const tokenService = new TokenService(new AuthRepository(prisma));

describe('POST /api/v1/auth/verify-email', () => {
  afterEach(async () => {
    await cleanupData();
  });

  it('verifies with valid token', async () => {
    const { res } = await createUnverifiedUser();
    const userId = res.body.data.user.id;
    
    const validToken = tokenService.generateOpaqueToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: tokenService.hashToken(validToken),
        expiresAt: new Date(Date.now() + 100000),
      }
    });

    const verifyRes = await verifyEmail(validToken);
    expect(verifyRes.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.emailVerified).toBe(true);
  });

  it('rejects invalid token', async () => {
    const verifyRes = await verifyEmail('invalid-token');
    expect(verifyRes.status).toBe(400);
  });

  it('rejects expired token', async () => {
    const { res } = await createUnverifiedUser();
    const userId = res.body.data.user.id;
    
    const expiredToken = tokenService.generateOpaqueToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: tokenService.hashToken(expiredToken),
        expiresAt: new Date(Date.now() - 100000), // Expired
      }
    });

    const verifyRes = await verifyEmail(expiredToken);
    expect(verifyRes.status).toBe(400);
  });

  it('rejects reused token', async () => {
    const { res } = await createUnverifiedUser();
    const userId = res.body.data.user.id;
    
    const validToken = tokenService.generateOpaqueToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: tokenService.hashToken(validToken),
        expiresAt: new Date(Date.now() + 100000),
      }
    });

    await verifyEmail(validToken);
    const reusedRes = await verifyEmail(validToken);
    expect(reusedRes.status).toBe(400);
  });

  it('rejects already verified user', async () => {
    const { res } = await createVerifiedUser();
    const userId = res.body.data.user.id;
    
    const validToken = tokenService.generateOpaqueToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: tokenService.hashToken(validToken),
        expiresAt: new Date(Date.now() + 100000),
      }
    });

    const verifyRes = await verifyEmail(validToken);
    expect(verifyRes.status).toBe(409); // Conflict
  });
});
