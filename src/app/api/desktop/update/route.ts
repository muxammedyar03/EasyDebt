import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GITHUB_REPO = "muxammedyar03/EasyDebt";
const LATEST_UPDATE_JSON_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/latest.json`;

export async function GET() {
  try {
    const res = await fetch(LATEST_UPDATE_JSON_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "EasyDebt-Desktop-Updater",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "No desktop release manifest available yet" }, { status: 404 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch desktop update manifest", details: String(error) },
      { status: 502 },
    );
  }
}
