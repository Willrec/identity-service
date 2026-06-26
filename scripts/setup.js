import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== Identity Service Project Setup ===\n');

// 1. Verify project prerequisites before initialization
const packageJsonExists = fs.existsSync(path.join(rootDir, 'package.json'));
const nodeModulesExists = fs.existsSync(path.join(rootDir, 'node_modules'));
let prismaAvailable = false;
if (nodeModulesExists) {
  try {
    prismaAvailable = fs.existsSync(path.join(rootDir, 'node_modules', 'prisma')) || 
                      fs.existsSync(path.join(rootDir, 'node_modules', '.bin', 'prisma'));
  } catch (e) {
    prismaAvailable = false;
  }
}

if (!packageJsonExists || !nodeModulesExists || !prismaAvailable) {
  console.error('❌ Error: Project prerequisites are missing.');
  if (!packageJsonExists) {
    console.error('   - package.json is missing in the root directory.');
  }
  if (!nodeModulesExists) {
    console.error('   - node_modules folder is missing. Dependencies must be installed first.');
  }
  if (nodeModulesExists && !prismaAvailable) {
    console.error('   - Prisma CLI is not available in node_modules.');
  }
  console.error('\nPlease run the following command to install dependencies before setting up:\n');
  console.error('   pnpm install\n');
  process.exit(1);
}

// 2. Verify Node version (>= 22.19.0)
const nodeVersion = process.version.substring(1);
const [nodeMajor, nodeMinor, nodePatch] = nodeVersion.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 19)) {
  console.error(`❌ Error: Node.js version ${process.version} is not supported. Required: >=22.19.0`);
  process.exit(1);
}
console.log(`✓ Node.js version verified: ${process.version}`);

// 3. Verify pnpm version (>= 9)
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
console.log(`✓ pnpm version verified: ${pnpmVersion}\n`);

// 4. Initialize .env if missing
console.log('Initializing environment file (.env)...');
try {
  execSync('node scripts/init-env.js', { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  console.error('❌ Error initializing .env file.');
  process.exit(1);
}

// 5. Generate RSA keys if missing
console.log('\nChecking/generating RSA keys...');
try {
  execSync('node scripts/generate-keys.js', { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  console.error('❌ Error checking/generating RSA keys.');
  process.exit(1);
}

// 6. Inject/configure keys in .env
console.log('\nConfiguring JWT keys in .env...');
try {
  execSync('node scripts/keys-env.js', { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  console.error('❌ Error configuring JWT keys in .env.');
  process.exit(1);
}

// 7. Generate Prisma Client
console.log('\nGenerating Prisma client...');
try {
  execSync('pnpm prisma:generate', { stdio: 'inherit', cwd: rootDir });
  console.log('✓ Prisma client generated successfully.');
} catch (e) {
  console.error('❌ Error generating Prisma client.');
  process.exit(1);
}

// 8. Validate environment variables
console.log('\nValidating environment variables...');
try {
  execSync('node --env-file=.env --import tsx/esm -e "import(\'./src/config/env.ts\')"', {
    stdio: 'inherit',
    cwd: rootDir,
  });
  console.log('✓ Environment variables validated successfully.');
} catch (e) {
  console.error('\n❌ Environment validation failed! Please check your .env file configurations.');
  process.exit(1);
}

// 9. Output formatted UX Summary
console.log('\n────────────────────────────────────');
console.log('✓ Environment initialized');
console.log('✓ RSA keys generated');
console.log('✓ JWT keys configured');
console.log('✓ Prisma Client generated');
console.log('\nNext steps:');
console.log('1. Configure DATABASE_URL (if using an external DB)');
console.log('2. Run database migrations:');
console.log('   pnpm prisma migrate deploy');
console.log('3. Seed the database:');
console.log('   pnpm seed');
console.log('4. Start the server:');
console.log('   pnpm dev');
console.log('────────────────────────────────────\n');
