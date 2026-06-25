import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to parse .env file manually
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return false;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      // Only set if not already defined (standard dotenv behavior)
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
  return true;
}

async function runDiagnostics() {
  console.log('=== Identity Service Diagnostics ===\n');

  const results = [];
  let overallPass = true;

  // Load .env
  const envPath = path.join(rootDir, '.env');
  const envExists = loadEnvFile(envPath);

  // 1. Node.js Version Check
  const nodeVer = process.version;
  const [nodeMajor, nodeMinor] = nodeVer.substring(1).split('.').map(Number);
  const nodePass = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 19);
  results.push({
    name: 'Node.js Version',
    pass: nodePass,
    message: nodePass ? `v${nodeVer.substring(1)}` : `Version ${nodeVer} is not supported. Required: >=22.19.0`,
  });
  if (!nodePass) overallPass = false;

  // 2. pnpm Version Check
  let pnpmVer = '';
  let pnpmPass = false;
  try {
    pnpmVer = execSync('pnpm --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const [pnpmMajor] = pnpmVer.split('.').map(Number);
    pnpmPass = pnpmMajor >= 9;
  } catch (e) {}
  results.push({
    name: 'pnpm Version',
    pass: pnpmPass,
    message: pnpmPass ? pnpmVer : `pnpm is either missing or unsupported (version: ${pnpmVer || 'unknown'}). Required: >=9`,
  });
  if (!pnpmPass) overallPass = false;

  // 3. Docker Availability Check
  let dockerPass = false;
  try {
    execSync('docker info', { stdio: 'ignore' });
    dockerPass = true;
  } catch (e) {}
  results.push({
    name: 'Docker Availability',
    pass: dockerPass,
    message: dockerPass ? 'Docker daemon is running' : 'Docker is not running or not installed. Local test runner requires Docker.',
  });
  // Note: Docker is recommended, but not strictly failing overall status if not running since we can use external DBs

  // 4. Required Environment Variables (.env check)
  let envPass = false;
  let envMessage = '';
  if (!envExists) {
    envMessage = 'Missing .env file. Run "pnpm env:init" to create one.';
  } else {
    try {
      execSync('node --import tsx/esm -e "import(\'./src/config/env.js\')"', {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      envPass = true;
      envMessage = 'Validated successfully';
    } catch (err) {
      envMessage = err.stderr ? err.stderr.toString().trim() : err.message;
    }
  }
  results.push({
    name: 'Required Environment Variables',
    pass: envPass,
    message: envMessage,
  });
  if (!envPass) overallPass = false;

  // 5. DATABASE_URL presence
  const dbUrl = process.env.DATABASE_URL;
  const dbUrlPass = !!dbUrl && dbUrl.startsWith('postgresql://');
  results.push({
    name: 'DATABASE_URL format',
    pass: dbUrlPass,
    message: dbUrlPass ? 'Defined and matches postgresql:// format' : 'Missing or invalid DATABASE_URL. Must start with postgresql://',
  });
  if (!dbUrlPass) overallPass = false;

  // 6. JWT RSA Keys Verification
  let keysPass = false;
  let keysMessage = '';
  const privateKey = process.env.JWT_PRIVATE_KEY;
  const publicKey = process.env.JWT_PUBLIC_KEY;
  if (!privateKey || !publicKey) {
    keysMessage = 'JWT keys are missing in .env. Run "pnpm keys:generate" to create them.';
  } else {
    try {
      const crypto = await import('crypto');
      const sign = crypto.createSign('SHA256');
      sign.update('diagnostics-token');
      const signature = sign.sign(privateKey.replace(/\\n/g, '\n'));
      const verify = crypto.createVerify('SHA256');
      verify.update('diagnostics-token');
      const verified = verify.verify(publicKey.replace(/\\n/g, '\n'), signature);
      if (verified) {
        keysPass = true;
        keysMessage = 'RSA key pair successfully verified for RS256 signing';
      } else {
        keysMessage = 'Validation failed: public and private keys do not match.';
      }
    } catch (err) {
      keysMessage = `Invalid key format: ${err.message}`;
    }
  }
  results.push({
    name: 'JWT RSA Keys',
    pass: keysPass,
    message: keysMessage,
  });
  if (!keysPass) overallPass = false;

  // 7. Prisma Client Check
  let prismaPass = false;
  let prismaMessage = '';
  let PrismaClientConstructor;
  try {
    const prismaModule = await import('@prisma/client');
    PrismaClientConstructor = prismaModule.PrismaClient;
    prismaPass = true;
    prismaMessage = 'Loaded successfully';
  } catch (err) {
    prismaMessage = 'Prisma Client is not generated. Run "pnpm prisma:generate".';
  }
  results.push({
    name: 'Prisma Client',
    pass: prismaPass,
    message: prismaMessage,
  });
  if (!prismaPass) overallPass = false;

  // 8 & 9. DB Connection and Pending Migrations Checks (only run if Prisma Client and DB URL are OK)
  let dbConnPass = false;
  let dbConnMessage = 'Skipped due to prior errors';
  let migrationPass = false;
  let migrationMessage = 'Skipped due to prior errors';

  if (prismaPass && dbUrlPass) {
    let prismaInstance;
    try {
      prismaInstance = new PrismaClientConstructor();
      await prismaInstance.$queryRaw`SELECT 1`;
      dbConnPass = true;
      dbConnMessage = 'Connected successfully';
    } catch (err) {
      dbConnMessage = `Connection failed: ${err.message}`;
    } finally {
      if (prismaInstance) {
        await prismaInstance.$disconnect();
      }
    }

    if (dbConnPass) {
      try {
        const output = execSync('npx prisma migrate status', {
          env: process.env,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        if (output.includes('Database schema is up to date')) {
          migrationPass = true;
          migrationMessage = 'Schema is up to date';
        } else {
          migrationMessage = 'Pending migrations found. Run "pnpm prisma migrate deploy" to apply.';
        }
      } catch (err) {
        migrationMessage = `Failed to get status: ${err.message}`;
      }
    } else {
      migrationMessage = 'Database connection failed. Skipping migration check.';
    }
  }

  results.push({
    name: 'PostgreSQL Connectivity',
    pass: dbConnPass,
    message: dbConnMessage,
  });
  if (!dbConnPass) overallPass = false;

  results.push({
    name: 'Pending Migrations',
    pass: migrationPass,
    message: migrationMessage,
  });
  if (!migrationPass) overallPass = false;

  // Display results
  for (const res of results) {
    const status = res.pass ? '✓' : '✗';
    console.log(`${status} ${res.name}: ${res.message}`);
  }

  console.log('\n=========================================');
  if (overallPass) {
    console.log('Status: PASS');
    console.log('Project is healthy and ready!');
  } else {
    console.log('Status: FAIL');
    console.log('Please resolve the failing checks listed above.');
    process.exit(1);
  }
  console.log('=========================================');
}

runDiagnostics().catch((err) => {
  console.error('Fatal doctor execution error:', err);
  process.exit(1);
});
