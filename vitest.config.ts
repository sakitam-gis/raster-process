import { UserConfig } from 'vitest';

const config: { test: UserConfig } = {
  test: {
    testTimeout: 500000,
    coverage: {
      reporter: ['lcov', 'html'],
    },
  },
}

export default config;
