import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// La API corre en :8080. El proxy evita CORS: el navegador solo habla con el mismo origen.
const api = { target: "http://localhost:8080", changeOrigin: true };
const page = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dos páginas: la app (/) y el deck del Demo Day (/pitch), sin código compartido.
  build: { rolldownOptions: { input: { main: page("./index.html"), pitch: page("./pitch/index.html") } } },
  server: { port: 3000, proxy: { "/v1": api, "/healthz": api } },
  preview: { port: 3000, proxy: { "/v1": api, "/healthz": api } },
});
