import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const path = join(process.cwd(), ".build-sha");
    const sha = readFileSync(path, "utf8").trim();
    return NextResponse.json(
      { commit: sha, builtAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { commit: "dev", builtAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
