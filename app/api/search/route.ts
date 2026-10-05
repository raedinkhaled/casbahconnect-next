import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/actions/general.action";

// Public search uses GET so typing can cancel an obsolete request instead of
// waiting behind other server actions in the client router's action queue.
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const type = request.nextUrl.searchParams.get("type");
  if (query.length > 200) {
    return NextResponse.json({ error: "Search must be 200 characters or fewer." }, { status: 400 });
  }

  try {
    const results: unknown = JSON.parse(await globalSearch({ query, type }));
    return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load search results. Please try again." }, { status: 503 });
  }
}
