import { forwardApiRequest } from "../../../lib/api-server";

export function GET(request: Request) {
  return forwardApiRequest(request, "/api/bills");
}
export function POST(request: Request) {
  return forwardApiRequest(request, "/api/bills");
}
