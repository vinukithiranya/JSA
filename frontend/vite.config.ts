import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_BACKEND_URL is set in Docker env; defaults to localhost for local dev
const backendUrl = process.env.VITE_BACKEND_URL ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",   // listen on all interfaces (needed inside Docker)
    port: 5173,
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
});
