// TEMPORARY dev-only guest login bypass — remove before shipping.
//
// POST sets the guest cookie (the dashboard's "Continue as guest"
// button calls this); DELETE clears it (guest sign-out). Both fail
// closed when GUEST_LOGIN_ENABLED is not "true": POST returns 403 and
// never sets the cookie, so no guest session can exist with the gate
// off.
import {
  clearGuestCookie,
  guestJson,
  isGuestLoginEnabled,
  setGuestCookie,
} from "../../../../lib/guest";

const GATE_OFF_MESSAGE =
  "Guest login is not enabled on this server. Set GUEST_LOGIN_ENABLED=true to enable the demo.";

export async function POST() {
  if (!isGuestLoginEnabled())
    return guestJson({ message: GATE_OFF_MESSAGE }, 403);
  await setGuestCookie();
  return guestJson({ ok: true });
}

export async function DELETE() {
  await clearGuestCookie();
  return guestJson({ ok: true });
}
