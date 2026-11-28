import { forwardApiRequest } from "../../../../lib/api-server";

export function POST(request: Request) {
  return forwardApiRequest(request, "/api/bills/auto-pay");
}
