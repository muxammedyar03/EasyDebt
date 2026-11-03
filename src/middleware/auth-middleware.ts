import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const GUEST_SESSION_COOKIE = "guest-demo-session";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production");

function clearSessionCookies(response: NextResponse) {
  response.cookies.set("auth-token", "", { path: "/", maxAge: 0 });
  response.cookies.set(GUEST_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth-token")?.value;

  // Verify token if it exists
  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch (error) {
      console.error("Invalid token:", error);
      if (pathname === "/auth/login") {
        const response = NextResponse.next();
        clearSessionCookies(response);
        return response;
      }
      const response = NextResponse.redirect(new URL("/auth/login", req.url));
      clearSessionCookies(response);
      return response;
    }
  }

  // Clear stale cookies when redirected with reason (e.g. session_expired)
  if (pathname === "/auth/login" && req.nextUrl.searchParams.has("reason")) {
    const response = NextResponse.next();
    clearSessionCookies(response);
    return response;
  }

  // Protect dashboard routes
  if (!isAuthenticated && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Redirect authenticated users away from register
  if (isAuthenticated && (pathname === "/auth/v2/register" || pathname.startsWith("/auth/v2"))) {
    return NextResponse.redirect(new URL("/dashboard/default", req.url));
  }

  return NextResponse.next();
}
