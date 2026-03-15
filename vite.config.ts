import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      'react-simple-maps': path.resolve(__dirname, 'node_modules/react-simple-maps/dist/index.js'),
    },
  },
  server: { proxy: { '/api': 'http://localhost:3000' } }
})
