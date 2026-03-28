import { handleApiRequest } from "../server/mockApiHandler.js";

export default async function handler(req, res) {
  return handleApiRequest(req, res);
}
