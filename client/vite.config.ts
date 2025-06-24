import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

// Detect if we're running in Railway (build from root) or Vercel (build from client directory)
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.cwd().includes('railway');

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Railway: @shared points to ../../shared (from client directory)
      // Vercel: @shared points to ./src/shared (from client directory)
      '@shared': isRailway 
        ? path.resolve(__dirname, '../../shared')
        : path.resolve(__dirname, './src/shared'),
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
    commonjsOptions: {
      include: [/node_modules/],
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env.RAILWAY_ENVIRONMENT': JSON.stringify(process.env.RAILWAY_ENVIRONMENT || ''),
  },
  ssr: {
    noExternal: []
  },
  css: {
    postcss: './postcss.config.js',
  }
})
