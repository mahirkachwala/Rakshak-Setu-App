import type { Plugin } from "vite";
import { handleApiRequest } from "../server/mockApiHandler.js";

export function mockApiPlugin(): Plugin {
  return {
    name: "rakshak-setu-json-db",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api")) {
          next();
          return;
        }

        try {
          await handleApiRequest(req, res);
        } catch (error) {
          next(error as Error);
        }
      });
    },
  };
}
