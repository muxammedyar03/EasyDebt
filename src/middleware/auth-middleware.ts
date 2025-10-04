import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
);

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
      // Token is invalid, clear it
      console.error("Invalid token:", error);
      const response = NextResponse.redirect(new URL("/auth/login", req.url));
      response.cookies.delete("auth-token");
      return response;
    }
  }

  // Protect dashboard routes
  if (!isAuthenticated && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Redirect authenticated users away from login/register
  if (
    isAuthenticated &&
    (pathname === "/auth/login" || pathname === "/auth/v2/register" || pathname.startsWith("/auth/v2"))
  ) {
    return NextResponse.redirect(new URL("/dashboard/default", req.url));
  }

  return NextResponse.next();
}
