import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

const require = createRequire(import.meta.url)
const cesiumModule: { default: () => Plugin } = require('vite-plugin-cesium')

export default defineConfig({
  plugins: [react(), tailwindcss(), cesiumModule.default()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
