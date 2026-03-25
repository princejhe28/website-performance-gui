import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 900, margin: "60px auto", padding: "0 20px" }}>
      <h1>Website Performance Monitor</h1>
      <p>
        This app runs scheduled PageSpeed Insights checks, stores the latest results in Vercel Blob,
        and creates Asana tasks for failed thresholds.
      </p>
      <p>
        <Link href="/dashboard">Open dashboard</Link>
      </p>
    </main>
  );
}