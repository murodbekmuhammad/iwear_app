import { config } from 'dotenv';
import { resolve } from 'path';

// e2e tests run against a separate database so they never touch dev data.
config({ path: resolve(__dirname, '../.env'), quiet: true });
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://iwear:iwear@localhost:5432/iwear_test?schema=public';
process.env.JWT_SECRET ??= 'test-secret';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), 'iwear-test-uploads');
