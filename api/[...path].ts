import { handleApiRequest } from "../server/mockApiHandler.js";
export default async function handler(req: any, res: any) {
  await handleApiRequest(req, res);
}
