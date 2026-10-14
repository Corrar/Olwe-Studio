import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  isKids: integer("is_kids", { mode: "boolean" }).notNull().default(false),
  /** Classificação indicativa máxima que o perfil pode ver (0 = livre). Conteúdo 18+ nunca aparece. */
  maxRating: integer("max_rating").notNull().default(16),
  createdAt: createdAt(),
});

export const watchlist = sqliteTable(
  "watchlist",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: ["movie", "tv", "archive", "commons"] }).notNull(),
    // ID do TMDB ou identificador do Internet Archive (a coluna mantém o nome original).
    itemId: text("tmdb_id").notNull(),
    addedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.mediaType, t.itemId] })],
);

export const progress = sqliteTable(
  "progress",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: ["movie", "tv", "archive", "commons"] }).notNull(),
    // ID do TMDB ou identificador do Internet Archive (a coluna mantém o nome original).
    itemId: text("tmdb_id").notNull(),
    position: integer("position").notNull().default(0),
    duration: integer("duration").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.mediaType, t.itemId] })],
);

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
