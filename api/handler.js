import { handleApiRequest } from "../server/mockApiHandler.js";

function normalizeApiUrl(req) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const rewrittenPath = url.searchParams.get("__path");

  if (!rewrittenPath) {
    return;
  }

  const normalizedPath = `/api/${rewrittenPath}`.replace(/\/{2,}/g, "/");
  url.pathname = normalizedPath;
  url.searchParams.delete("__path");
  req.url = `${url.pathname}${url.search}`;
}

export default async function handler(req, res) {
  normalizeApiUrl(req);
  return handleApiRequest(req, res);
}
