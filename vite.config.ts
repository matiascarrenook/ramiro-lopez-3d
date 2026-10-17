import { defineConfig } from "vite";

export default defineConfig({
  // Vercel sirve el sitio en la raíz ("/"); GitHub Pages lo sirve en el subpath del repo.
  base: process.env.VERCEL ? "/" : "/ramiro-lopez-3d/",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2022",
  },
});