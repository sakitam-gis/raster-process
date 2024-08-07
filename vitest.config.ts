import { UserConfig } from 'vitest/node';

const config: { test: UserConfig } = {
  test: {
    testTimeout: 500000,
    exclude: ['node_modules', '.idea', '.git', '.cache'],
    coverage: {
      reporter: ['lcov', 'html'],
    },
    deps: {
      // fallbackCJS: false,
      // interopDefault: true,
      // registerNodeLoader: true,
    },
  },
}

export default config;
