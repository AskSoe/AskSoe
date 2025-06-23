import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress all TypeScript warnings during build
        if (warning.code && warning.code.startsWith('TS')) {
          return;
        }
        warn(warning);
      },
    },
    // Ensure proper module resolution during build
    commonjsOptions: {
      include: [/node_modules/],
    },
    // Ensure proper chunking
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    // Suppress TypeScript errors during build
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  optimizeDeps: {
    include: ['@/shared/schema', 'react', 'react-dom']
  },
  // Ensure proper TypeScript handling
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  // Ensure proper module resolution
  ssr: {
    noExternal: ['@/shared/schema']
  }
})
