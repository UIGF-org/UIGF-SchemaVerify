import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    // Ajv is loaded by the worker, so include it before the first upload.
    include: ['ajv'],
  },
})
