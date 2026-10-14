"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/session";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, fields: { name: raw.name ?? "", email: raw.email ?? "" } };
  }
  const { name, email, password } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } });
  if (existing) return { error: "Já existe uma conta com este e-mail.", fields: { name, email } };

  const userId = crypto.randomUUID();
  await db.insert(users).values({ id: userId, name, email, passwordHash: await bcrypt.hash(password, 10) });
  await db.insert(profiles).values({ id: crypto.randomUUID(), userId, name: name.split(" ")[0], avatar: "ember", maxRating: 16 });

  await createSession(userId);
  redirect("/profiles");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: { email: raw.email ?? "" } };

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos.", fields: { email: parsed.data.email } };
  }

  await createSession(user.id);
  redirect("/profiles");
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
