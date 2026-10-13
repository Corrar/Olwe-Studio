import { NextResponse, type NextRequest } from "next/server";

// Checagem otimista: só confere se o cookie existe. A validação real fica na camada de dados (src/lib/dal.ts).
const PROTECTED = ["/browse", "/movies", "/series", "/title", "/watch", "/search", "/my-list", "/profiles", "/account"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("olwe_session");

  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icon.svg).*)"],
};
