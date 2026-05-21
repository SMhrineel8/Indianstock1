import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // Point this directly to your live deployed Render backend
        target: 'https://indianstock1.onrender.com', 
        changeOrigin: true,
        secure: true, // ensures SSL/HTTPS works correctly
      }
    }
  }
})
