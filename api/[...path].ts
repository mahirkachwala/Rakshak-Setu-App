import { handleApiRequest } from "../server/mockApiHandler";

export default async function handler(req: any, res: any) {
  await handleApiRequest(req, res);
}
