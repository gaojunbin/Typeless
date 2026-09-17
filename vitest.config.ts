import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['tests/**/*.test.ts', 'src/renderer/**/*.test.ts'], environment: 'node' } });
