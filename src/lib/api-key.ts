import { NextRequest, NextResponse } from "next/server";

function getEnvApiKey(): string | null {
  const val = process.env.N8N_API_KEY;
  if (val && val.trim().length > 0) return val.trim();
  return null;
}

export function extractApiKey(req: NextRequest): string | null {
  // Header: x-api-key: <key>
  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();

  // Authorization: Bearer <key>
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  // Query param: ?api_key=<key>
  const { searchParams } = new URL(req.url);
  const queryKey = searchParams.get("api_key");
  if (queryKey) return queryKey.trim();

  return null;
}

export function verifyApiKey(provided: string | null): boolean {
  const expected = getEnvApiKey();
  if (!expected) return false; // secure by default if not configured
  if (!provided) return false;
  return provided === expected;
}

export function requireApiKey(req: NextRequest): NextResponse | null {
  const provided = extractApiKey(req);
  const ok = verifyApiKey(provided);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized", message: "Invalid or missing API key" }, { status: 401 });
  }
  return null;
}
