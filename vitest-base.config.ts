// Learn more about Vitest configuration options at https://vitest.dev/config/

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./projects/opentui-lib/test/vitest.setup.ts'],
    fileParallelism: false,
    testTimeout: 0,
    inspect: true
  },
});
