import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handleFeedback } from './server/feedback.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/feedback': {
        bypass(req, res) {
          handleFeedback(req, res);
          return true;
        }
      }
    }
  }
})
