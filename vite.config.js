import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/voice-guess-arknights/',
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/audio': {
        target: 'http://localhost:5173',
        changeOrigin: true
      }
    }
  }
})
