import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
// base: '/' wenn Custom Domain (admin.kunstwolff.de), sonst '/kunstwolff-admin/' für GitHub Pages default URL
export default defineConfig({
  plugins: [preact()],
  base: '/',
})
