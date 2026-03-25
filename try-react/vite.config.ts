import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'plotly-vendor': ['react-plotly.js', 'plotly.js-basic-dist-min'],
          'math-vendor': ['katex', 'mathlive'],
        },
      },
    },
  },
})
