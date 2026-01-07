import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/met': {
        target: 'https://collectionapi.metmuseum.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/met/, ''),
      },
    },
  },
});
