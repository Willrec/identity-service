import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';

// Load .env.test into process.env so that test:integration
// (prisma + vitest) receives all required variables.
config({ path: '.env.test' });

// Helper to run a command inheriting the current process.env
function runCommand(command) {
  console.log(`\n> ${command}`);
  const result = spawnSync(command, { stdio: 'inherit', shell: true, env: process.env });
  return result.status;
}

async function main() {
  console.log('--- Setting up Local Docker Test Environment ---');

  // 1. Start Docker container and wait for healthcheck
  const dbUp = runCommand('npm run test:db:up');
  if (dbUp !== 0) {
    console.error('Failed to start test database.');
    process.exit(1);
  }

  // 2. Run integration suite (prisma generate + validate + migrate + vitest)
  let testStatus = 0;
  try {
    testStatus = runCommand('pnpm test:integration');
  } catch (error) {
    console.error('Integration tests encountered an unexpected error:', error);
    testStatus = 1;
  }

  // 3. ALWAYS tear down the database container regardless of test outcome
  console.log('\n--- Tearing down Local Docker Test Environment ---');
  const dbDown = runCommand('npm run test:db:down');

  if (dbDown !== 0) {
    console.error('Failed to tear down test database cleanly.');
  }

  // Pass along the exit code of the actual tests
  process.exit(testStatus);
}

main();
