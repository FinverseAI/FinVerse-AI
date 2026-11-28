"use client";

import ProfileError, {
  type RouteErrorProps,
} from "../../../../../auth/profile-error";

export default function Error(props: RouteErrorProps) {
  return (
    <ProfileError
      {...props}
      title="Unable to load the stock overview"
      backHref="/market"
      backLabel="Back to market"
    />
  );
}
