import { NextResponse, type NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { confirmEmail } from "@/lib/verification";

// Link do e-mail de confirmação: confirma a conta e leva para a escolha de perfil (ou para o login).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const userId = token ? await confirmEmail(token) : null;
  const loggedIn = await getSessionUserId();

  const target = userId
    ? loggedIn === userId
      ? "/profiles"
      : "/login?verified=1"
    : loggedIn
      ? "/confirm-email?error=link"
      : "/login?error=link";
  return NextResponse.redirect(new URL(target, request.url));
}
