import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "olwe_session";
const PROFILE_COOKIE = "olwe_profile";
const MAX_AGE = 60 * 60 * 24 * 30;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET não definido");
  }
  return new TextEncoder().encode(secret ?? "olwe-dev-secret-troque-em-producao");
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions);
  store.delete(PROFILE_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(PROFILE_COOKIE);
}

// O perfil ativo também vai assinado: com o bloqueio de perfil, não pode ser trocado editando o cookie.
export async function setActiveProfileId(profileId: string) {
  const token = await new SignJWT({ profileId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  (await cookies()).set(PROFILE_COOKIE, token, cookieOptions);
}

export async function getActiveProfileId(): Promise<string | null> {
  const token = (await cookies()).get(PROFILE_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return typeof payload.profileId === "string" ? payload.profileId : null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
