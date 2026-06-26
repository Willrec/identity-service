import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const steps = [
  { key: 'Lint', label: 'Lint....................', command: 'pnpm lint' },
  { key: 'Build', label: 'Build...................', command: 'pnpm build' },
  { key: 'OpenAPI', label: 'OpenAPI.................', command: 'pnpm openapi' },
  { key: 'Tests', label: 'Tests...................', command: 'pnpm test:local' },
];

const results = {};
for (const step of steps) {
  results[step.key] = 'PENDING';
}

let failed = false;

console.log('=== Repository Verification Pipeline ===\n');

for (const step of steps) {
  console.log(`Running ${step.key} (${step.command})...`);
  try {
    execSync(step.command, { stdio: 'inherit', cwd: rootDir });
    results[step.key] = 'PASS';
  } catch (err) {
    results[step.key] = 'FAIL';
    failed = true;
    
    // Mark remaining steps as SKIPPED
    const currentIndex = steps.findIndex(s => s.key === step.key);
    for (let i = currentIndex + 1; i < steps.length; i++) {
      results[steps[i].key] = 'SKIPPED';
    }
    break;
  }
}

console.log('\n=== Verification Summary ===');
for (const step of steps) {
  let statusText = results[step.key];
  if (statusText === 'PASS') {
    statusText = '\x1b[32mPASS\x1b[0m'; // Green
  } else if (statusText === 'FAIL') {
    statusText = '\x1b[31mFAIL\x1b[0m'; // Red
  } else if (statusText === 'SKIPPED') {
    statusText = '\x1b[33mSKIPPED\x1b[0m'; // Yellow
  }
  console.log(`${step.label} ${statusText}`);
}

console.log('');
if (failed) {
  console.error('\x1b[31m❌ Verification failed!\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m✔ Repository ready for push.\x1b[0m');
  process.exit(0);
}
