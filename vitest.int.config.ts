// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@game': resolve(__dirname, 'src/game'),
      '@components': resolve(__dirname, 'src/components'),
      '@mocks': resolve(__dirname, 'src/mocks'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    // Limit discovery to files in /src
    dir: 'src',
    // Integration Test files with .spec or .specs in their filenames
    include: ['**/*.{spec,specs}.{ts,tsx,js,jsx}'],

    // normal Vitest options
    environment: 'jsdom',
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
  // optional: ignore directories in the Vite watcher if you need to
  // server: {
  //   watch: {
  //     ignored: ['**/dist/**', '**/node_modules/**']
  //   }
  // }
})
