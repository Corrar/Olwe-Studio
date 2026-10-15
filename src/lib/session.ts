import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "olwe_session";
const PROFILE_COOKIE = "olwe_profile";
const NEXT_COOKIE = "olwe_next";
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

/** Abre a sessão; sessionVersion é a versão atual da conta (troca de senha encerra as sessões antigas). */
export async function createSession(userId: string, sessionVersion: number) {
  const token = await new SignJWT({ userId, sv: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions);
  store.delete(PROFILE_COOKIE);
}

/** Sessão do cookie (conta e versão). Sessões antigas, sem versão, contam como versão 0. */
export async function getSession(): Promise<{ userId: string; sessionVersion: number } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId, sessionVersion: typeof payload.sv === "number" ? payload.sv : 0 };
  } catch {
    return null;
  }
}

/** Conta da sessão sem consultar o banco (a versão é conferida em getCurrentUser). */
export async function getSessionUserId(): Promise<string | null> {
  return (await getSession())?.userId ?? null;
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(PROFILE_COOKIE);
  store.delete(NEXT_COOKIE);
}

// O perfil ativo também vai assinado: com o bloqueio de perfil, não pode ser trocado editando o cookie.
// Perfil bloqueado: o acesso liberado pelo PIN guarda a versão do bloqueio (trocar ou remover o PIN
// invalida os acessos antigos), dura no máximo 4 horas e acaba quando o navegador fecha.
const UNLOCKED_MAX_AGE = 60 * 60 * 4;

export async function setActiveProfileId(profileId: string, lockVersion?: number) {
  const locked = lockVersion !== undefined;
  const token = await new SignJWT(locked ? { profileId, lockVersion } : { profileId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${locked ? UNLOCKED_MAX_AGE : MAX_AGE}s`)
    .sign(secretKey());
  const { maxAge, ...sessionOnly } = cookieOptions;
  (await cookies()).set(PROFILE_COOKIE, token, locked ? sessionOnly : { ...sessionOnly, maxAge });
}

export async function getActiveProfile(): Promise<{ profileId: string; lockVersion: number | null } | null> {
  const token = (await cookies()).get(PROFILE_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.profileId !== "string") return null;
    return { profileId: payload.profileId, lockVersion: typeof payload.lockVersion === "number" ? payload.lockVersion : null };
  } catch {
    return null;
  }
}

/** Sai do perfil ativo (volta para "Quem está assistindo?"). */
export async function clearActiveProfile() {
  (await cookies()).delete(PROFILE_COOKIE);
}

/**
 * Destino depois de escolher o perfil, guardado no cadastro (ex.: quem escolheu o Premium vai para a
 * assinatura). Só destinos fixos do app: o valor do cookie nunca vira um redirecionamento livre.
 */
const AFTER_PROFILE = ["/plans"] as const;
export type AfterProfile = (typeof AFTER_PROFILE)[number];

export async function setAfterProfile(path: AfterProfile) {
  (await cookies()).set(NEXT_COOKIE, path, { ...cookieOptions, maxAge: 60 * 60 * 24 });
}

/** Lê e apaga o destino guardado (vale uma vez só). */
export async function takeAfterProfile(): Promise<AfterProfile | null> {
  const store = await cookies();
  const value = store.get(NEXT_COOKIE)?.value;
  if (!value) return null;
  store.delete(NEXT_COOKIE);
  return (AFTER_PROFILE as readonly string[]).includes(value) ? (value as AfterProfile) : null;
}

/** Token assinado de uso único por finalidade (ex.: link de confirmação de e-mail). */
export async function signToken(purpose: string, claims: Record<string, string>, expiresIn: string) {
  return new SignJWT({ ...claims, purpose }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresIn).sign(secretKey());
}

export async function readToken(purpose: string, token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload.purpose === purpose ? payload : null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
