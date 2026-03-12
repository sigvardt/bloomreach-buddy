import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/bin/bloomreach.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
