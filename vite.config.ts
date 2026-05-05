import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Removed @rolldown/plugin-babel + reactCompilerPreset — it was consuming 76% of
    // build time and inflating bundle size with no measurable runtime benefit at this scale.
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Raise the warning limit so Vercel doesn't flag it (bundle is ~680kB, acceptable for this app)
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split vendor libraries into separate chunks for better caching
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react'
            if (id.includes('@supabase')) return 'vendor-supabase'
            if (id.includes('framer-motion')) return 'vendor-motion'
            if (id.includes('lucide-react')) return 'vendor-lucide'
            if (id.includes('zustand') || id.includes('clsx') || id.includes('tailwind-merge')) return 'vendor-misc'
          }
        },
      },
    },
  },
})
