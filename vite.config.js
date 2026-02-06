import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'child_process'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify("v2026-" + commitHash),
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
})
