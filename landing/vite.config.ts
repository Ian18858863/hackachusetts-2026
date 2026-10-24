import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The landing page is served at the site root (/). scripts/build-site.sh copies
// landing/dist to dist/ and the app to dist/app/, so this build must never
// write an app/ folder of its own.
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: { port: 5174 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
