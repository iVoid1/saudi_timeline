import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
<<<<<<< HEAD
    allowedHosts: ['mutawa.ddns.net'],
=======
>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
    host: true,
    port: 5173,
    open: false,

<<<<<<< HEAD
=======
    allowedHosts: [
      'mutawa.ddns.net',
    ],

>>>>>>> 23d341b91bc37cbfc16ab0dcf8251c3c37f6a0e8
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})