import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

// Sem DATABASE_URL na Vercel, usa um SQLite temporário em /tmp (os dados somem quando a instância reinicia).
const url = process.env.DATABASE_URL || (process.env.VERCEL ? "file:/tmp/olwe.db" : "file:./data/olwe.db");

function connect() {
  if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
  return drizzle(createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN }), { schema });
}

// O Next pode carregar este módulo em mais de um pacote de rotas no mesmo processo. A conexão e a
// migração ficam no escopo global para existir uma só por processo (senão as cópias migram ao mesmo
// tempo e o SQLite responde "database is locked").
const shared = globalThis as typeof globalThis & {
  __olweDb?: ReturnType<typeof connect>;
  __olweMigration?: Promise<void>;
};

export const db = (shared.__olweDb ??= connect());

// Aplica as migrações pendentes ao iniciar (arquivo local ou Turso). Se duas instâncias da Vercel
// migrarem ao mesmo tempo, uma pode falhar porque a outra já aplicou: segue em frente.
shared.__olweMigration ??= migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") }).catch((err) => {
  console.error("[db] falha ao aplicar migrações", err);
});
await shared.__olweMigration;
