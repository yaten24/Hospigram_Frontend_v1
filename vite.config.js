import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// /api is proxied to the Hospigram API in development; nginx does the same in production.
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: process.env.VITE_API_PROXY || "http://127.0.0.1:5090", changeOrigin: true } },
  },
  build: { chunkSizeWarningLimit: 700 },
});
