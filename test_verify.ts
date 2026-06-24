import { prisma } from './src/infrastructure/database/prisma.js';
import { TokenService } from './src/modules/auth/services/token.service.js';
import { AuthRepository } from './src/modules/auth/repositories/auth.repository.js';
import { EMAIL_VERIFY_TOKEN_TTL_S } from './src/config/constants.js';

const API_URL = 'http://localhost:3000/api/v1';

async function requestAPI(method: string, path: string, body?: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  const authRepo = new AuthRepository(prisma);
  const tokenService = new TokenService(authRepo);

  console.log('--- Email Verification Test ---');

  // Helper: clear user if exists
  await prisma.user.deleteMany({ where: { email: 'test_verify@example.com' } });

  // Create unverified user
  const user = await prisma.user.create({
    data: {
      email: 'test_verify@example.com',
      passwordHash: 'dummy',
      firstName: 'Test',
      lastName: 'Verify',
      emailVerified: false,
      status: 'ACTIVE'
    }
  });

  console.log('\n[1] Login blocked before verification -> 403');
  const loginRes1 = await requestAPI('POST', '/auth/login', {
    email: 'test_verify@example.com',
    password: 'SecurePassword123'
  });
  console.log(loginRes1.status === 403 ? '✓ Blocked (403)' : `✗ Failed (got ${loginRes1.status})`);

  console.log('\n[2] Expired token returns 400');
  const expiredToken = tokenService.generateOpaqueToken();
  await authRepo.createEmailVerificationToken({
    userId: user.id,
    tokenHash: tokenService.hashToken(expiredToken),
    expiresAt: new Date(Date.now() - 1000) // expired
  });
  const expRes = await requestAPI('POST', '/auth/verify-email', { token: expiredToken });
  console.log(expRes.status === 400 ? '✓ Expired token rejected (400)' : `✗ Failed (got ${expRes.status})`);
  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }); // clean up

  console.log('\n[3] Invalid token returns 400');
  const invRes = await requestAPI('POST', '/auth/verify-email', { token: 'invalid_token_123' });
  console.log(invRes.status === 400 ? '✓ Invalid token rejected (400)' : `✗ Failed (got ${invRes.status})`);

  console.log('\n[4] Valid token verification');
  const validToken = tokenService.generateOpaqueToken();
  await authRepo.createEmailVerificationToken({
    userId: user.id,
    tokenHash: tokenService.hashToken(validToken),
    expiresAt: new Date(Date.now() + 100000) // valid
  });
  const validRes = await requestAPI('POST', '/auth/verify-email', { token: validToken });
  console.log(validRes.status === 200 ? '✓ Valid token verified (200)' : `✗ Failed (got ${validRes.status})`);

  console.log('\n[5] Token cannot be reused');
  const reuseRes = await requestAPI('POST', '/auth/verify-email', { token: validToken });
  console.log(reuseRes.status === 400 ? '✓ Token reuse rejected (400)' : `✗ Failed (got ${reuseRes.status})`);

  console.log('\n[6] Already verified user returns 409 Conflict');
  const extraToken = tokenService.generateOpaqueToken();
  await authRepo.createEmailVerificationToken({
    userId: user.id,
    tokenHash: tokenService.hashToken(extraToken),
    expiresAt: new Date(Date.now() + 100000) // valid
  });
  const alreadyRes = await requestAPI('POST', '/auth/verify-email', { token: extraToken });
  console.log(alreadyRes.status === 409 ? '✓ Already verified rejected (409)' : `✗ Failed (got ${alreadyRes.status})`);

  console.log('\n[7] Login allowed after verification (will get 401 instead of 403 because dummy hash)');
  const loginRes2 = await requestAPI('POST', '/auth/login', {
    email: 'test_verify@example.com',
    password: 'SecurePassword123'
  });
  console.log(loginRes2.status === 401 ? '✓ Login allowed past email check (401 invalid creds)' : `✗ Failed (got ${loginRes2.status})`);

  console.log('\n[8] Resend Verification Email (Already Verified)');
  const resendRes1 = await requestAPI('POST', '/auth/resend-verification', { email: 'test_verify@example.com' });
  console.log(resendRes1.status === 409 ? '✓ Resend rejected for already verified user (409)' : `✗ Failed (got ${resendRes1.status})`);

  console.log('\n[9] Resend Verification Email (Unverified User)');
  // set to unverified for test
  await prisma.user.update({ where: { email: 'test_verify@example.com' }, data: { emailVerified: false } });
  const resendRes2 = await requestAPI('POST', '/auth/resend-verification', { email: 'test_verify@example.com' });
  console.log(resendRes2.status === 200 ? '✓ Resend successful for unverified user (200)' : `✗ Failed (got ${resendRes2.status})`);

  await prisma.$disconnect();
}

runTests().catch(console.error);
