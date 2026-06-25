import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const keysDir = path.join(rootDir, 'keys');
const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

const force = process.argv.includes('--force');

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const privateKeyExists = fs.existsSync(privateKeyPath);
const publicKeyExists = fs.existsSync(publicKeyPath);

if ((privateKeyExists || publicKeyExists) && !force) {
  console.log('Keys already exist in keys/ directory. Use --force to overwrite.');
  process.exit(0);
}

try {
  console.log('Generating 2048-bit RSA key pair...');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
  fs.writeFileSync(publicKeyPath, publicKey, 'utf8');
  console.log('Successfully generated keys:');
  console.log(`- Private key: ${privateKeyPath}`);
  console.log(`- Public key: ${publicKeyPath}`);
} catch (err) {
  console.error('Failed to generate keys:', err.message);
  process.exit(1);
}
