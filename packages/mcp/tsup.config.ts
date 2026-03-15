import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin/bloomreach-mcp.ts'],
  format: ['esm'],
  dts: { compilerOptions: { composite: false } },
  clean: true,
  sourcemap: true,
});
