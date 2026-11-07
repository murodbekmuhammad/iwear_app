// Copies the MediaPipe body-tracking runtime (WebAssembly) next to the website, so the
// camera try-on loads it from our own site instead of a third-party CDN.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const from = join(dirname(require.resolve('@mediapipe/tasks-vision')), 'wasm');
const to = join(dirname(fileURLToPath(import.meta.url)), '..', '.mediapipe');
mkdirSync(to, { recursive: true });
for (const file of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
  copyFileSync(join(from, file), join(to, file));
}
