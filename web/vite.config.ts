import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// WDS Vision native build — Vite dev server on 5173 proxies /api → 127.0.0.1:8000
// (the FastAPI server runs in a separate cmd window; no Docker).

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
