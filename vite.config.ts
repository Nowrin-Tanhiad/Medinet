import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['.onrender.com', 'medinet-xd80.onrender.com', 'localhost', '127.0.0.1', 'all'],
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.onrender.com', 'medinet-xd80.onrender.com', 'localhost', '127.0.0.1', 'all'],
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost/Medinet',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/app.[ext]',
      },
    },
  },
});
