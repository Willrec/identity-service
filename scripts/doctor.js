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
  for (const line of content.split(/\r?\n/)) {
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

  const criticalChecks = [];
  const optionalChecks = [];

  // Load .env
  const envPath = path.join(rootDir, '.env');
  const envExists = loadEnvFile(envPath);

  // 1. Node.js Version Check
  const nodeVer = process.version;
  const [nodeMajor, nodeMinor] = nodeVer.substring(1).split('.').map(Number);
  const nodePass = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 19);
  criticalChecks.push({
    name: 'Node.js Version',
    pass: nodePass,
    message: nodePass ? `v${nodeVer.substring(1)}` : `Version ${nodeVer} is not supported. Required: >=22.19.0`,
  });

  // 2. pnpm Version Check
  let pnpmVer = '';
  let pnpmPass = false;
  try {
    pnpmVer = execSync('pnpm --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const [pnpmMajor] = pnpmVer.split('.').map(Number);
    pnpmPass = pnpmMajor >= 9;
  } catch (e) {}
  criticalChecks.push({
    name: 'pnpm Version',
    pass: pnpmPass,
    message: pnpmPass ? pnpmVer : `pnpm is either missing or unsupported (version: ${pnpmVer || 'unknown'}). Required: >=9`,
  });

  // 3. Required Environment Variables (.env check)
  let envPass = false;
  let envMessage = '';
  if (!envExists) {
    envMessage = 'Missing .env file. Run "pnpm env:init" to create one.';
  } else {
    try {
      execSync('node --import tsx/esm -e "import(\'./src/config/env.ts\')"', {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      envPass = true;
      envMessage = 'Validated successfully';
    } catch (err) {
      envMessage = err.stderr ? err.stderr.toString().trim() : err.message;
    }
  }
  criticalChecks.push({
    name: 'Required Environment Variables',
    pass: envPass,
    message: envMessage,
  });

  // 4. DATABASE_URL presence
  const dbUrl = process.env.DATABASE_URL;
  const dbUrlPass = !!dbUrl && dbUrl.startsWith('postgresql://');
  criticalChecks.push({
    name: 'DATABASE_URL format',
    pass: dbUrlPass,
    message: dbUrlPass ? 'Defined and matches postgresql:// format' : 'Missing or invalid DATABASE_URL. Must start with postgresql://',
  });

  // 5. JWT RSA Keys Verification
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
  criticalChecks.push({
    name: 'JWT RSA Keys',
    pass: keysPass,
    message: keysMessage,
  });

  // 6. Prisma Client Check
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
  criticalChecks.push({
    name: 'Prisma Client',
    pass: prismaPass,
    message: prismaMessage,
  });

  // 7 & 8. DB Connection and Pending Migrations Checks (only run if Prisma Client and DB URL are OK)
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

  criticalChecks.push({
    name: 'PostgreSQL Connectivity',
    pass: dbConnPass,
    message: dbConnMessage,
  });

  criticalChecks.push({
    name: 'Pending Migrations',
    pass: migrationPass,
    message: migrationMessage,
  });

  // OPTIONAL CHECKS:
  // 1. Docker Engine Check
  let dockerPass = false;
  let dockerMessage = '';
  try {
    execSync('docker info', { stdio: 'ignore' });
    dockerPass = true;
    dockerMessage = 'Docker daemon is running';
  } catch (e) {
    dockerMessage = 'Docker is not running or not installed. Local test runner requires Docker.';
  }
  optionalChecks.push({
    name: 'Docker Engine',
    pass: dockerPass,
    message: dockerMessage,
  });

  // 2. Docker Compose Check
  let composePass = false;
  let composeMessage = '';
  try {
    execSync('docker compose version', { stdio: 'ignore' });
    composePass = true;
    composeMessage = 'Docker Compose is available';
  } catch (e) {
    try {
      execSync('docker-compose --version', { stdio: 'ignore' });
      composePass = true;
      composeMessage = 'Docker Compose (legacy v1) is available';
    } catch (err) {
      composeMessage = 'Docker Compose is not available. Required for "pnpm test:local".';
    }
  }
  optionalChecks.push({
    name: 'Docker Compose',
    pass: composePass,
    message: composeMessage,
  });

  // 3. Git Check
  let gitPass = false;
  let gitMessage = '';
  try {
    const gitVer = execSync('git --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    gitPass = true;
    gitMessage = gitVer;
  } catch (e) {
    gitMessage = 'Git is not installed. Recommended for repository workflows.';
  }
  optionalChecks.push({
    name: 'Git Installation',
    pass: gitPass,
    message: gitMessage,
  });

  // 4. OpenAPI spec existence
  const openapiPath = path.join(rootDir, 'docs', 'openapi', 'openapi.json');
  const openapiPass = fs.existsSync(openapiPath);
  optionalChecks.push({
    name: 'OpenAPI Spec File',
    pass: openapiPass,
    message: openapiPass ? 'docs/openapi/openapi.json exists' : 'OpenAPI spec file not found. Run "pnpm openapi" to build.',
  });

  // 5. Orval CLI Check
  let orvalPass = false;
  let orvalMessage = '';
  try {
    const orvalInNodeModules = fs.existsSync(path.join(rootDir, 'node_modules', 'orval'));
    if (orvalInNodeModules) {
      orvalPass = true;
      orvalMessage = 'Orval package is installed in node_modules';
    } else {
      execSync('npx orval --version', { stdio: 'ignore' });
      orvalPass = true;
      orvalMessage = 'Orval CLI is available globally via npx';
    }
  } catch (e) {
    orvalMessage = 'Orval CLI is not available. Required for openapi types generation.';
  }
  optionalChecks.push({
    name: 'Orval CLI',
    pass: orvalPass,
    message: orvalMessage,
  });

  // Display Critical results
  console.log('CRITICAL CHECKS:');
  let criticalFailed = false;
  for (const res of criticalChecks) {
    if (res.pass) {
      console.log(`  \x1b[32m✓\x1b[0m ${res.name}: ${res.message}`);
    } else {
      console.log(`  \x1b[31m✗\x1b[0m ${res.name}: ${res.message}`);
      criticalFailed = true;
    }
  }

  // Display Optional results
  console.log('\nOPTIONAL CHECKS:');
  let optionalFailed = false;
  for (const res of optionalChecks) {
    if (res.pass) {
      console.log(`  \x1b[32m✓\x1b[0m ${res.name}: ${res.message}`);
    } else {
      console.log(`  \x1b[33m⚠\x1b[0m ${res.name}: ${res.message}`);
      optionalFailed = true;
    }
  }

  console.log('\n=========================================');
  if (criticalFailed) {
    console.log('\x1b[31mStatus: FAIL\x1b[0m');
    console.log('Please resolve the failing critical checks listed above.');
    console.log('=========================================');
    process.exit(1);
  } else {
    console.log('\x1b[32mStatus: PASS\x1b[0m');
    if (optionalFailed) {
      console.log('Project is healthy, but some optional tools are missing.');
    } else {
      console.log('Project is completely healthy and ready!');
    }
    console.log('=========================================');
    process.exit(0);
  }
}

runDiagnostics().catch((err) => {
  console.error('Fatal doctor execution error:', err);
  process.exit(1);
});
