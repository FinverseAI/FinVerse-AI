import { redirect } from "next/navigation";

export default function AuthRoute() {
  redirect("/auth/sign-up");
}
