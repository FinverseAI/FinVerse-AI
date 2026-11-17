import StatusScreen from "../components/status-screen";

export default function NotFound() {
  return (
    <StatusScreen label="404 / Page not found" title="This page is not here.">
      <p>The address may have changed. Head back to FinVerse to continue.</p>
    </StatusScreen>
  );
}
