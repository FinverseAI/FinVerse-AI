import LandingPage from "./landing-page";
import Dashboard from "./dashboard/dashboard";
import type { AuthUser } from "../../auth/types";
import type { ProfileResponse } from "../../lib/profile";

type AppScreen = "landing" | "dashboard";

export default function Main({
  screen = "landing",
  user,
  profileData,
}: {
  screen?: AppScreen;
  user?: AuthUser;
  profileData?: ProfileResponse;
}) {
  if (screen === "dashboard" && profileData?.profile)
    return <Dashboard user={user} profileData={profileData} />;

  return <LandingPage />;
}
