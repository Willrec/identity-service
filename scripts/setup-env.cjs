const crypto = require('crypto');
const fs = require('fs');

if (!fs.existsSync('.env')) {
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('Copied .env.example to .env');
  } else {
    fs.writeFileSync('.env', '');
    console.log('Created empty .env');
  }
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const formattedPrivate = privateKey.replace(/\n/g, '\\n');
const formattedPublic = publicKey.replace(/\n/g, '\\n');

fs.appendFileSync('.env', `\nJWT_PRIVATE_KEY="${formattedPrivate}"\nJWT_PUBLIC_KEY="${formattedPublic}"\n`);
console.log('Successfully generated RSA keys and appended to .env');
