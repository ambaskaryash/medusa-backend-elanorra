import { defineConfig } from "vite"
import medusaDashboard from "@medusajs/dashboard/vite-plugin"

export default defineConfig({
  plugins: [
    medusaDashboard(),
  ],
})
