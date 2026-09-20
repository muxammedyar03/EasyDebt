import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import { getJwtKey } from "@/lib/security/secrets";

export async function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth-token")?.value;

  // Verify token if it exists
  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, getJwtKey(), { algorithms: ["HS256"], audience: "easydebt-session" });
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

  // Login remains reachable with a revoked cookie. Authoritative session checks
  // run on the server; Edge cannot check user/tenant status in PostgreSQL.
  return NextResponse.next();
}
