import "server-only";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

// Sem DATABASE_URL na Vercel, usa um SQLite temporário em /tmp (os dados somem quando a instância reinicia).
const url = process.env.DATABASE_URL || (process.env.VERCEL ? "file:/tmp/olwe.db" : "file:./data/olwe.db");

function connect() {
  if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
  return createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
}

// O Next pode carregar este módulo em mais de um pacote de rotas no mesmo processo. A conexão e a
// migração ficam no escopo global para existir uma só por processo (senão as cópias migram ao mesmo
// tempo e o SQLite responde "database is locked"). O drizzle é recriado a cada carga do módulo para
// pegar o schema atual no modo de desenvolvimento.
const shared = globalThis as typeof globalThis & {
  __olweClient?: ReturnType<typeof connect>;
  __olweMigration?: { key: string; done: Promise<void> };
};

export const db = drizzle((shared.__olweClient ??= connect()), { schema });

// Aplica as migrações pendentes ao iniciar (arquivo local ou Turso), de novo só quando surge uma
// migração nova. Se duas instâncias da Vercel migrarem ao mesmo tempo, uma pode falhar porque a outra
// já aplicou: segue em frente.
const migrationsFolder = path.join(process.cwd(), "drizzle");
const migrationKey = readMigrationKey();
if (shared.__olweMigration?.key !== migrationKey) {
  const previous = shared.__olweMigration?.done ?? Promise.resolve();
  shared.__olweMigration = {
    key: migrationKey,
    // Outro processo (outro worker do build, outra instância) pode estar migrando o mesmo banco: tenta
    // de novo algumas vezes, com pausas crescentes; cada tentativa só aplica o que ainda faltar.
    done: previous
      .then(() => migrateWithRetry(3))
      .catch((err) => {
        console.error("[db] falha ao aplicar migrações", err);
      }),
  };
}
await shared.__olweMigration.done;

async function migrateWithRetry(retries: number): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await migrate(db, { migrationsFolder });
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1) + Math.random() * 500));
    }
  }
}

function readMigrationKey() {
  try {
    return readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8");
  } catch {
    return "";
  }
}
