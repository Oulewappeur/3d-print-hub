import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Voeg de onderstaande regel toe. 
  // Dit zorgt ervoor dat alle verwijzingen naar scripts en styles kloppen op GitHub Pages.
  base: '/3d-print-hub/', 
})
