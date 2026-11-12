import { forwardProfileRequest } from "../../../lib/profile-server";

export function GET(request: Request) {
  return forwardProfileRequest(request, "/api/profile");
}

export function PUT(request: Request) {
  return forwardProfileRequest(request, "/api/profile");
}
