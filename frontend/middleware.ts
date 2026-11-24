import { NextRequest, NextResponse } from "next/server";

/**
 * year.thebarbazza.com → /year-one documentary brief
 * Also accepts oneyear.* and year-one.* for convenience.
 */
export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const { pathname } = request.nextUrl;

  const isYearHost =
    host.startsWith("year.") || host.startsWith("oneyear.") || host.startsWith("year-one.");

  if (!isYearHost) return NextResponse.next();

  // Keep static assets / next internals as-is
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // files like /logo.png, /year-one/*.jpg
  ) {
    return NextResponse.next();
  }

  if (pathname === "/" || pathname === "") {
    const url = request.nextUrl.clone();
    url.pathname = "/year-one";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
