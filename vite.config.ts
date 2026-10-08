import { defineConfig } from "vite";

export default defineConfig({
  base: "/ramiro-lopez-3d/",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2022",
  },
});