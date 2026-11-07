import { execSync } from 'child_process';
import { resolve } from 'path';

// Bring the test database schema up to date before any test runs.
export default function globalSetup() {
  require('./env');
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
}
