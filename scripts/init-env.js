import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is one level up from scripts/
const rootDir = path.resolve(__dirname, '..');
const src = path.join(rootDir, '.env.example');
const dest = path.join(rootDir, '.env');

if (fs.existsSync(dest)) {
  console.log(`.env already exists. Skipping initialization to prevent overwriting.`);
} else {
  try {
    fs.copyFileSync(src, dest);
    console.log(`Successfully initialized .env from .env.example`);
  } catch (err) {
    console.error(`Failed to initialize .env:`, err.message);
    process.exit(1);
  }
}
