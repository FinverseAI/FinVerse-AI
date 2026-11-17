import { forwardApiRequest } from "../../../lib/api-server";

export function GET(request: Request) {
  return forwardApiRequest(request, "/api/transactions");
}
export function POST(request: Request) {
  return forwardApiRequest(request, "/api/transactions");
}
