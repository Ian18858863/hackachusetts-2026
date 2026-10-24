import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The app is served under /app/ on the deployed site; the API lives at the
// site root (/api/*). In local dev there are no functions, so /api calls fail
// unless API_PROXY_TARGET points at a running backend
// (e.g. API_PROXY_TARGET=http://localhost:8788 npm run dev).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_PROXY_TARGET;

  return {
    base: '/app/',
    plugins: [react()],
    server: {
      port: 5173,
      proxy: apiTarget ? { '/api': { target: apiTarget, changeOrigin: true } } : undefined,
    },
    preview: {
      port: 4173,
      proxy: apiTarget ? { '/api': { target: apiTarget, changeOrigin: true } } : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
