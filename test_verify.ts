import { prisma } from './src/infrastructure/database/prisma.js';
import { TokenService } from './src/modules/auth/services/token.service.js';
import { AuthRepository } from './src/modules/auth/repositories/auth.repository.js';
import { EMAIL_VERIFY_TOKEN_TTL_S } from './src/config/constants.js';

const API_URL = 'http://localhost:3000/api/v1';

async function requestAPI(method: string, path: string, body?: any, cookie?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => null);
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, data, setCookie };
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

  console.log('\n--- Forgot Password Test ---');
  
  console.log('\n[10] Forgot Password (Valid Verified Email)');
  await prisma.user.update({ where: { email: 'test_verify@example.com' }, data: { emailVerified: true } });
  const forgotRes1 = await requestAPI('POST', '/auth/forgot-password', { email: 'test_verify@example.com' });
  console.log(forgotRes1.status === 200 ? '✓ Valid verified email returns 200' : `✗ Failed (got ${forgotRes1.status})`);

  console.log('\n[11] Forgot Password (Unknown Email)');
  const forgotRes2 = await requestAPI('POST', '/auth/forgot-password', { email: 'unknown@example.com' });
  console.log(forgotRes2.status === 200 ? '✓ Unknown email returns 200' : `✗ Failed (got ${forgotRes2.status})`);

  console.log('\n[12] Forgot Password (Unverified Email)');
  await prisma.user.update({ where: { email: 'test_verify@example.com' }, data: { emailVerified: false } });
  const forgotRes3 = await requestAPI('POST', '/auth/forgot-password', { email: 'test_verify@example.com' });
  console.log(forgotRes3.status === 200 ? '✓ Unverified email returns 200' : `✗ Failed (got ${forgotRes3.status})`);

  console.log('\n--- Reset Password Test ---');
  await prisma.user.update({ where: { email: 'test_verify@example.com' }, data: { emailVerified: true } });
  
  const resetToken = tokenService.generateOpaqueToken();
  await authRepo.createPasswordResetToken({
    userId: user.id,
    tokenHash: tokenService.hashToken(resetToken),
    expiresAt: new Date(Date.now() + 100000)
  });

  // Also create a dummy session and refresh token to verify they are revoked
  const testSession = await authRepo.createSession({ userId: user.id, expiresAt: new Date(Date.now() + 100000) });
  const testRefreshToken = await authRepo.createRefreshToken({
    userId: user.id,
    sessionId: testSession.id,
    tokenHash: 'dummy_hash',
    expiresAt: new Date(Date.now() + 100000)
  });

  console.log('\n[13] Invalid reset token returns 400');
  const resetInvRes = await requestAPI('POST', '/auth/reset-password', { token: 'invalid_token', newPassword: 'NewStrongPassword123!' });
  console.log(resetInvRes.status === 400 ? '✓ Invalid token rejected (400)' : `✗ Failed (got ${resetInvRes.status})`);

  console.log('\n[14] Valid token resets password');
  const resetRes = await requestAPI('POST', '/auth/reset-password', { token: resetToken, newPassword: 'NewStrongPassword123!' });
  console.log(resetRes.status === 200 ? '✓ Valid token resets password (200)' : `✗ Failed (got ${resetRes.status})`);

  console.log('\n[15] Token cannot be reused');
  const resetReuseRes = await requestAPI('POST', '/auth/reset-password', { token: resetToken, newPassword: 'NewStrongPassword123!' });
  console.log(resetReuseRes.status === 400 ? '✓ Token reuse rejected (400)' : `✗ Failed (got ${resetReuseRes.status})`);

  // Verify sessions and refresh tokens were revoked
  const sessionAfter = await prisma.session.findUnique({ where: { id: testSession.id } });
  const refreshTokenAfter = await prisma.refreshToken.findUnique({ where: { id: testRefreshToken.id } });
  console.log(sessionAfter?.revoked ? '✓ Session revoked' : '✗ Session not revoked');
  console.log(refreshTokenAfter?.revoked ? '✓ Refresh token revoked' : '✗ Refresh token not revoked');

  // Verify login with new password works
  console.log('\n[16] Login with new password');
  const loginNewPassRes = await requestAPI('POST', '/auth/login', {
    email: 'test_verify@example.com',
    password: 'NewStrongPassword123!'
  });
  console.log(loginNewPassRes.status === 200 ? '✓ Login with new password successful (200)' : `✗ Failed (got ${loginNewPassRes.status})`);

  console.log('\n--- Secure Cookie Flow Test ---');

  console.log('\n[17] Login returns secure HttpOnly cookie');
  const setCookieHeader = loginNewPassRes.setCookie;
  let cookieOk = false;
  let cookieVal = '';
  if (setCookieHeader && setCookieHeader.includes('__Host-refresh=') && setCookieHeader.includes('HttpOnly') && setCookieHeader.includes('SameSite=Lax') && setCookieHeader.includes('Path=/')) {
    cookieOk = true;
    cookieVal = setCookieHeader.split(';')[0]; // "__Host-refresh=..."
  }
  console.log(cookieOk ? '✓ Secure cookie header is correct' : '✗ Failed to get correct secure cookie');

  console.log('\n[18] Refresh rotates the cookie');
  const refreshRes = await requestAPI('POST', '/auth/refresh', undefined, cookieVal);
  let refreshCookieOk = false;
  let newCookieVal = '';
  if (refreshRes.status === 200 && refreshRes.setCookie && refreshRes.setCookie !== setCookieHeader && refreshRes.setCookie.includes('__Host-refresh=')) {
    refreshCookieOk = true;
    newCookieVal = refreshRes.setCookie.split(';')[0];
  }
  console.log(refreshCookieOk ? '✓ Refresh successful and cookie rotated' : '✗ Failed to rotate cookie');

  console.log('\n[19] Logout clears the cookie');
  const logoutRes = await requestAPI('POST', '/auth/logout', undefined, newCookieVal);
  let logoutCookieOk = false;
  if (logoutRes.status === 200 && logoutRes.setCookie && logoutRes.setCookie.includes('Expires=')) {
    logoutCookieOk = true;
  }
  console.log(logoutCookieOk ? '✓ Logout successful and cookie cleared' : '✗ Failed to clear cookie');

  const afterLogoutRes = await requestAPI('POST', '/auth/refresh', undefined, newCookieVal);
  console.log(afterLogoutRes.status === 401 ? '✓ Refresh after logout blocked (401)' : `✗ Failed (got ${afterLogoutRes.status})`);

  await prisma.$disconnect();
}

runTests().catch(console.error);
