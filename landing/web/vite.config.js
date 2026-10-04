import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api/* to the Python backend (server_plain.py) on :8788,
// so the React app and the translator API can be developed/run separately.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
});
