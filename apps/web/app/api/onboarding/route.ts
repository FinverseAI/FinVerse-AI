import { forwardProfileRequest } from "../../../lib/profile-server";

export function POST(request: Request) {
  return forwardProfileRequest(request, "/api/onboarding");
}
