import { spawnSync } from 'node:child_process';

// Helper to run a command and log output in real-time
function runCommand(command) {
  console.log(`\n> ${command}`);
  const result = spawnSync(command, { stdio: 'inherit', shell: true });
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

  // 2. Run integrations (generate, validate, migrate, vitest)
  let testStatus = 0;
  try {
    testStatus = runCommand('npm run test:integration');
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
