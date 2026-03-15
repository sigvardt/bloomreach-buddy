import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/bin/bloomreach.ts'],
  format: ['esm'],
  dts: { compilerOptions: { composite: false } },
  clean: true,
  sourcemap: true,
});
