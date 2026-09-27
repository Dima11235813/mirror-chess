import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  /*
   * The engine runs in a Web Worker, and Vite builds workers with a **separate** plugin
   * pipeline — the `plugins` array above does not apply to them. Without this, the worker
   * bundle cannot resolve `@game/*` or `@engine/*`, and the build fails with a "failed to
   * resolve import" that names the *client* file rather than the worker, which is a
   * confusing place to start debugging.
   *
   * `worker.plugins` is a function because Vite instantiates that pipeline separately and
   * wants a fresh plugin instance for it.
   */
  worker: {
    format: 'es',
    plugins: () => [tsconfigPaths()],
  },
})
