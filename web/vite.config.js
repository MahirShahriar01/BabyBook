import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' lets the built site run from any folder or static host.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, host: true },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'], motion: ['framer-motion'] },
      },
    },
  },
});
