"use client";

import ProfileError, {
  type RouteErrorProps,
} from "../../../auth/profile-error";

export default function Error(props: RouteErrorProps) {
  return (
    <ProfileError
      {...props}
      title="Unable to load your dashboard"
      backHref="/"
      backLabel="Back to home"
    />
  );
}
