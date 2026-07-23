import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // During `pnpm dev`, run the PHP API locally from the project root with:
    //   php -S localhost:8000
    // Requests to /api and /uploads are proxied to it.
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    },
  },
})
