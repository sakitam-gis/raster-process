import { UserConfig } from 'vitest';

const config: { test: UserConfig } = {
  test: {
    testTimeout: 500000,
    exclude: ['node_modules', '.idea', '.git', '.cache'],
    coverage: {
      reporter: ['lcov', 'html'],
    },
    transformMode: {
      ssr: [/\.(tsx)$/],
    },
    deps: {
      external: ['@sakitam-gis/affine', '@sakitam-gis/mercantile'],
      // fallbackCJS: false,
      // interopDefault: true,
      // registerNodeLoader: true,
    },
  },
}

export default config;
