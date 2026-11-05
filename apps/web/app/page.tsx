export default async function Home() {
  const res = await fetch("http://localhost:3001/api/health", {
    cache: "no-store",
  });

  const data = await res.json();

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-xl border p-8 shadow-lg">
        <h1 className="text-3xl font-bold mb-4">FinVerse AI</h1>

        <p><strong>Backend Status:</strong> {data.success ? "✅ Connected" : "❌ Failed"}</p>

        <p className="mt-2">{data.message}</p>

        <p className="mt-2 text-sm text-gray-500">
          {data.timestamp}
        </p>
      </div>
    </main>
  );
}