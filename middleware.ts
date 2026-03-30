import { getIronSession } from "iron-session";
import { NextRequest, NextResponse } from "next/server";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    getSessionOptions(),
  );

  if (request.nextUrl.pathname.startsWith("/lk") && !session.isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/lk/:path*"],
};
