import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

const GITHUB_REPO = "muxammedyar03/EasyDebt";
const RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platformParam = searchParams.get("platform")?.toLowerCase();

  const userAgent = req.headers.get("user-agent") || "";
  let targetPlatform = platformParam;

  if (!targetPlatform) {
    if (userAgent.includes("Win")) {
      targetPlatform = "windows";
    } else if (userAgent.includes("Linux") || userAgent.includes("Ubuntu")) {
      targetPlatform = "deb";
    } else {
      targetPlatform = "windows";
    }
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "EasyDebt-Desktop-Downloader",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.redirect(RELEASES_PAGE, 302);
    }

    const release = (await res.json()) as GitHubRelease;
    const assets = release.assets || [];

    let matchedAsset: GitHubAsset | undefined;

    if (targetPlatform === "windows" || targetPlatform === "exe") {
      matchedAsset = assets.find((a) => a.name.endsWith(".exe") || a.name.endsWith(".msi"));
    } else if (targetPlatform === "deb" || targetPlatform === "ubuntu") {
      matchedAsset = assets.find((a) => a.name.endsWith(".deb"));
    } else if (targetPlatform === "appimage") {
      matchedAsset = assets.find((a) => a.name.endsWith(".AppImage"));
    }

    if (matchedAsset?.browser_download_url) {
      return NextResponse.redirect(matchedAsset.browser_download_url, 302);
    }

    return NextResponse.redirect(RELEASES_PAGE, 302);
  } catch {
    return NextResponse.redirect(RELEASES_PAGE, 302);
  }
}
