import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [
        'src/**/*.test.js',
        'src/**/*.spec.js',
        'src/ai-help.js', // Static help text (576 lines)
        'src/api/client.js', // HTTP wrapper (requires real API)
        'src/commands/auth.js', // Interactive auth flow
        'src/auth.js', // OAuth token flow (requires real API)
      ],
      thresholds: {
        // API + Commands layers must hit 85%
        // Core utils (config, ids) have lower threshold due to edge cases
        lines: 85,
        functions: 85,
        branches: 75, // Branch coverage harder for CLI code
        statements: 85,
      },
    },
  },
});
