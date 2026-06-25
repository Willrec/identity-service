import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== Identity Service Project Setup ===\n');

// 1. Verify Node version (>= 22.19.0)
const nodeVersion = process.version.substring(1);
const [nodeMajor, nodeMinor, nodePatch] = nodeVersion.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 19)) {
  console.error(`❌ Error: Node.js version ${process.version} is not supported. Required: >=22.19.0`);
  process.exit(1);
}
console.log(`✓ Node.js version verified: ${process.version}`);

// 2. Verify pnpm version (>= 9)
let pnpmVersion = '';
try {
  pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
} catch (e) {
  console.error('❌ Error: pnpm is not installed. Required: >=9');
  process.exit(1);
}
const [pnpmMajor] = pnpmVersion.split('.').map(Number);
if (pnpmMajor < 9) {
  console.error(`❌ Error: pnpm version ${pnpmVersion} is not supported. Required: >=9`);
  process.exit(1);
}
console.log(`✓ pnpm version verified: ${pnpmVersion}`);

// 3. Install dependencies
console.log('\nInstalling dependencies (pnpm install)...');
try {
  execSync('pnpm install', { stdio: 'inherit', cwd: rootDir });
  console.log('✓ Dependencies installed successfully.');
} catch (e) {
  console.error('❌ Error installing dependencies.');
  process.exit(1);
}

// 4. Initialize .env
console.log('\nInitializing environment file (.env)...');
try {
  execSync('node scripts/init-env.js', { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  console.error('❌ Error initializing .env file.');
  process.exit(1);
}

// 5. Generate RSA keys if missing
console.log('\nChecking JWT RSA keys...');
try {
  execSync('node scripts/generate-keys.js', { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  console.error('❌ Error checking/generating RSA keys.');
  process.exit(1);
}

// 6. Run prisma generate
console.log('\nGenerating Prisma client...');
try {
  execSync('pnpm prisma:generate', { stdio: 'inherit', cwd: rootDir });
  console.log('✓ Prisma client generated successfully.');
} catch (e) {
  console.error('❌ Error generating Prisma client.');
  process.exit(1);
}

// 7. Validate environment
console.log('\nValidating environment variables...');
try {
  // Run a sub-process loading the .env file and importing env.ts via tsx
  execSync('node --env-file=.env --import tsx/esm -e "import(\'./src/config/env.js\')"', {
    stdio: 'inherit',
    cwd: rootDir,
  });
  console.log('✓ Environment variables validated successfully.');
} catch (e) {
  console.error('\n❌ Environment validation failed! Please check your .env file configurations.');
  process.exit(1);
}

console.log('\n=========================================');
console.log('🎉 Setup Completed Successfully!');
console.log('=========================================');
console.log('The Identity Service is ready for development.');
console.log('To start the development server, run:');
console.log('  pnpm dev');
console.log('=========================================');
