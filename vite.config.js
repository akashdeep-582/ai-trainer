import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true, // automatically open browser on dev
  },
  build: {
    minify: 'esbuild', // uses esbuild for super-fast builds
  },
})
