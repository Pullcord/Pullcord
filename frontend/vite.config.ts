import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// La API corre en :8080. El proxy evita CORS: el navegador solo habla con el mismo origen.
const api = { target: "http://localhost:8080", changeOrigin: true };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3000, proxy: { "/v1": api, "/healthz": api } },
  preview: { port: 3000, proxy: { "/v1": api, "/healthz": api } },
});
