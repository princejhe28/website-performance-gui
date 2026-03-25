import { getLatestRun } from "@/lib/blob";

export const dynamic = "force-dynamic";

export async function GET() {
  const latest = await getLatestRun();

  if (!latest) {
    return Response.json({ ok: true, summary: null, message: "No results yet" });
  }

  return Response.json({ ok: true, summary: latest });
}