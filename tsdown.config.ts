import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  // The package targets modern Fetch-compatible runtimes supported by Ky.
  target: 'es2022',
});
