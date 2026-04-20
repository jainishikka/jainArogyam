import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Ensures Vite treats the root as the project folder
  build: {
    outDir: '../dist', // Output folder (relative to the project root)
    emptyOutDir: true, // Clears the output directory before building
  },
  server: {
    port: 3000,
    open: true,
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:5001',
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, ''),
    //   },
    // },
    // Add historyApiFallback for development
    historyApiFallback: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  base: '/',
});