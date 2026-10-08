import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

// `--mode web` runs only the renderer in a browser with the in-memory mock bridge
// (useful for layout work without Electron).
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'web'
      ? []
      : [
          electron({
            main: {
              entry: 'electron/main.ts',
              vite: { build: { outDir: 'dist-electron', rollupOptions: { external: ['electron'] } } },
            },
            preload: {
              input: 'electron/preload.ts',
              vite: { build: { outDir: 'dist-electron', rollupOptions: { external: ['electron'] } } },
            },
          }),
        ]),
  ],
  build: { outDir: 'dist' },
  server: { port: 5173, strictPort: true },
}));
