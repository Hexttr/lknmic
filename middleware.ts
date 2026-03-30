import { getIronSession } from "iron-session";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    getSessionOptions(),
  );

  const path = request.nextUrl.pathname;

  if (path.startsWith("/admin")) {
    if (!session.isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.role !== Role.ADMIN) {
      return NextResponse.redirect(new URL("/lk", request.url));
    }
    return response;
  }

  if (path.startsWith("/lk")) {
    if (!session.isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.role === Role.ADMIN) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/lk/:path*", "/admin/:path*"],
};
