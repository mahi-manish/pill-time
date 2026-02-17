import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
          'ui-components': ['@radix-ui/react-label', '@radix-ui/react-slot', 'lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          'form-utils': ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
  },
})