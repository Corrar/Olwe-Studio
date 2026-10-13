import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

// Sem DATABASE_URL na Vercel, usa um SQLite temporário em /tmp (os dados somem quando a instância reinicia).
const url = process.env.DATABASE_URL || (process.env.VERCEL ? "file:/tmp/olwe.db" : "file:./data/olwe.db");

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

export const db = drizzle(client, { schema });

// Aplica as migrações pendentes ao iniciar (arquivo local ou Turso). Se duas instâncias
// migrarem ao mesmo tempo, uma pode falhar porque a outra já criou as tabelas: segue em frente.
if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
try {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
} catch (err) {
  console.error("[db] falha ao aplicar migrações", err);
}
