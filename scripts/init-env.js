import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

function initFile(srcName, destName) {
  const src = join(rootDir, srcName);
  const dest = join(rootDir, destName);

  if (fs.existsSync(dest)) {
    console.log(`${destName} already exists. Skipping initialization to prevent overwriting.`);
  } else {
    try {
      fs.copyFileSync(src, dest);
      console.log(`Successfully initialized ${destName} from ${srcName}`);
    } catch (err) {
      console.error(`Failed to initialize ${destName}:`, err.message);
      process.exit(1);
    }
  }
}

initFile('.env.example', '.env');
initFile('.env.test.example', '.env.test');
