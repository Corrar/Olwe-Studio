import { mkdirSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.DATABASE_URL ?? "file:./data/olwe.db";
if (url.startsWith("file:")) mkdirSync("data", { recursive: true });

const db = drizzle(createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN }));
await migrate(db, { migrationsFolder: "./drizzle" });
console.log(`Migrações aplicadas em ${url}`);
