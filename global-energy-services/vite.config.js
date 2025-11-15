import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handleFeedback } from './server/feedback.js'
import { handleChat } from './server/chat.js'

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
      },
      '/api/chat': {
        bypass(req, res) {
          handleChat(req, res);
          return true;
        }
      }
    }
  }
})
