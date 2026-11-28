import Link from "next/link";
import StatusScreen from "../components/status-screen";

export default function NotFound() {
  return (
    <StatusScreen
      label="404 / Page not found"
      title="This page is not here."
      action={
        <Link href="/dashboard" className="dash-primary">
          Open dashboard
        </Link>
      }
    >
      <p>Check the address or return to FinVerse.</p>
    </StatusScreen>
  );
}
