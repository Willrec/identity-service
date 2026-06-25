import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';

// 1. Generate keys for the test
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Set env vars BEFORE importing any config or service
process.env.NODE_ENV = 'development';
process.env.PORT = '3000';
process.env.DATABASE_URL = 'postgresql://dummy';
process.env.CORS_ORIGINS = 'http://localhost';
process.env.JWT_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n');
process.env.JWT_PUBLIC_KEY = publicKey.replace(/\n/g, '\\n');
process.env.JWT_ACCESS_TOKEN_EXPIRES_IN = '15m';
process.env.JWT_ACCESS_SECRET = 'change_me_access_secret_at_least_32_chars';
process.env.JWT_REFRESH_SECRET = 'change_me_refresh_secret_at_least_32_chars';
process.env.BCRYPT_SALT_ROUNDS = '12';

async function run() {
  // Dynamic import so env vars are set before env.ts is evaluated
  const { TokenService } = await import('../src/infrastructure/security/jwt.js');
  
  const tokenService = new TokenService();
  
  // 1. Generate token for a test user
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    status: 'ACTIVE',
  };

  const token = tokenService.signAccessToken(mockUser);

  // 2. Print generated token
  console.log('\n--- Generated Token ---');
  console.log(token);

  // 3 & 4 & 5. Verify token and print payload
  console.log('\n--- Valid Token Verification ---');
  try {
    const payload = tokenService.verifyAccessToken(token);
    console.log('✅ Decoded Payload:', payload);
    console.log('✅ Issuer, audience, and RS256 enforced successfully.');
  } catch (error: any) {
    console.error('❌ Expected success, got error:', error.message);
  }

  // 6. Attempt verification with invalid cases
  
  console.log('\n--- Attempt: Invalid Issuer ---');
  try {
    jwt.verify(token, publicKey, { algorithms: ['RS256'], issuer: 'invalid-issuer', audience: 'identity-client' });
    console.error('❌ Expected error, but verification passed!');
  } catch (error: any) {
    console.log('✅ verification failed as expected:', error.message);
  }

  console.log('\n--- Attempt: Invalid Audience ---');
  try {
    jwt.verify(token, publicKey, { algorithms: ['RS256'], issuer: 'identity-service-api', audience: 'invalid-audience' });
    console.error('❌ Expected error, but verification passed!');
  } catch (error: any) {
    console.log('✅ verification failed as expected:', error.message);
  }

  console.log('\n--- Attempt: Modified Token ---');
  const [header, payloadB64, signature] = token.split('.');
  const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  decodedPayload.email = 'hacked@example.com';
  const modifiedPayloadB64 = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
  const modifiedToken = `${header}.${modifiedPayloadB64}.${signature}`;

  try {
    tokenService.verifyAccessToken(modifiedToken);
    console.error('❌ Expected error, but verification passed!');
  } catch (error: any) {
    console.log('✅ verification failed as expected:', error.message);
  }
}

run().catch(console.error);
