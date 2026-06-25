import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApiSpec } from '../src/docs/openapi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.resolve(__dirname, '../docs/openapi/openapi.json');

try {
  // Ensure target directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  
  fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2), 'utf8');
  console.log(`Successfully generated static OpenAPI specification at: ${outputPath}`);
} catch (error) {
  console.error('Failed to generate static OpenAPI specification:', error);
  process.exit(1);
}
