import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'
import fs from 'fs'

// Detect if we're running in Railway (build from root) or Vercel (build from client directory)
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.cwd().includes('railway');

// Determine the correct path for @shared alias
const getSharedPath = () => {
  const railwayPath = path.resolve(__dirname, '../../shared');
  const vercelPath = path.resolve(__dirname, './src/shared');
  
  // Check if Railway path exists (when building from root)
  if (isRailway && fs.existsSync(railwayPath)) {
    return railwayPath;
  }
  
  // Check if Vercel path exists (when building from client directory)
  if (fs.existsSync(vercelPath)) {
    return vercelPath;
  }
  
  // Fallback to Railway path if neither exists (for Railway builds)
  return railwayPath;
};

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': getSharedPath(),
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
