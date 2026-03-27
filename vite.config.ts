import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { mockApiPlugin } from "./dev/mockApi";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  Object.assign(process.env, env);

  const rawPort = env.PORT || process.env.PORT || "3000";
  const port = Number(rawPort);
  const basePath = env.BASE_PATH || process.env.BASE_PATH || "/";

  return {
    base: basePath,
    plugins: [mockApiPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },
    server: {
      port: Number.isNaN(port) || port <= 0 ? 3000 : port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
    preview: {
      port: Number.isNaN(port) || port <= 0 ? 3000 : port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
