import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const privateKeyPath = path.join(rootDir, 'keys', 'private.pem');
const publicKeyPath = path.join(rootDir, 'keys', 'public.pem');
const envPath = path.join(rootDir, '.env');
const testEnvPath = path.join(rootDir, '.env.test');

const force = process.argv.includes('--force');

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

// 1. Verify PEM keys exist
if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
  fail('Missing RSA keys under keys/ directory. Run "pnpm keys:generate" first.');
}

// 2. Verify .env exists
if (!fs.existsSync(envPath)) {
  fail('Missing .env file. Please run "pnpm env:init" first.');
}

// 3. Format PEM keys
const privatePEM = fs.readFileSync(privateKeyPath, 'utf8').trim();
const publicPEM = fs.readFileSync(publicKeyPath, 'utf8').trim();

// Convert to single line with escaped newlines and wrap in quotes
const formattedPrivate = `"${privatePEM.replace(/\r?\n/g, '\\n')}"`;
const formattedPublic = `"${publicPEM.replace(/\r?\n/g, '\\n')}"`;

function injectKeys(filePath) {
  if (!fs.existsSync(filePath)) return;

  const fileName = path.basename(filePath);
  let envContent = fs.readFileSync(filePath, 'utf8');

  // Simple parser to find existing keys
  const lines = envContent.split(/\r?\n/);
  let privateKeyLineIndex = -1;
  let publicKeyLineIndex = -1;
  let privateValue = '';
  let publicValue = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('JWT_PRIVATE_KEY=')) {
      privateKeyLineIndex = i;
      privateValue = line.substring('JWT_PRIVATE_KEY='.length).trim();
    }
    if (line.startsWith('JWT_PUBLIC_KEY=')) {
      publicKeyLineIndex = i;
      publicValue = line.substring('JWT_PUBLIC_KEY='.length).trim();
    }
  }

  // Check placeholders
  const isPrivatePlaceholder = privateValue === '' || 
                               privateValue.includes('YOUR_RSA_2048_PRIVATE_KEY_HERE') || 
                               privateValue.includes('...') ||
                               privateValue === '""';
  const isPublicPlaceholder = publicValue === '' || 
                              publicValue.includes('YOUR_RSA_2048_PUBLIC_KEY_HERE') || 
                              publicValue.includes('...') ||
                              publicValue === '""';

  const hasExistingPrivate = privateKeyLineIndex !== -1 && !isPrivatePlaceholder;
  const hasExistingPublic = publicKeyLineIndex !== -1 && !isPublicPlaceholder;

  if (hasExistingPrivate && hasExistingPublic && !force) {
    console.log(`✓ JWT keys are already configured in ${fileName}. Skipping injection.`);
    return;
  }

  // Perform injection
  let newLines = [...lines];

  function setOrAppendKey(key, value, lineIndex) {
    const newLine = `${key}=${value}`;
    if (lineIndex !== -1) {
      newLines[lineIndex] = newLine;
    } else {
      newLines.push(newLine);
    }
  }

  let changed = false;

  if (!hasExistingPrivate || force) {
    setOrAppendKey('JWT_PRIVATE_KEY', formattedPrivate, privateKeyLineIndex);
    changed = true;
  }

  if (!hasExistingPublic || force) {
    setOrAppendKey('JWT_PUBLIC_KEY', formattedPublic, publicKeyLineIndex);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    console.log(`✓ Successfully configured JWT_PRIVATE_KEY and JWT_PUBLIC_KEY in ${fileName}`);
  }
}

// Inject into both environment files
injectKeys(envPath);
injectKeys(testEnvPath);
