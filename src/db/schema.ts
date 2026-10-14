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
    /** Conta criada com confirmação de e-mail obrigatória e ainda não confirmada. */
    emailVerificationPending: integer("email_verification_pending", { mode: "boolean" }).notNull().default(false),
    /** Quando o e-mail foi confirmado pelo link enviado no cadastro. */
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp" }),
    /** Último envio do e-mail de confirmação, para limitar reenvios. */
    verificationSentAt: integer("verification_sent_at", { mode: "timestamp" }),
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
  /** Bloqueio de perfil (como na Netflix): hash do PIN de 4 dígitos, ou null sem bloqueio. */
  pinHash: text("pin_hash"),
  /** Muda a cada alteração do bloqueio: invalida os acessos já liberados com o PIN antigo. */
  lockVersion: integer("lock_version").notNull().default(0),
  /** Tentativas erradas de PIN seguidas e até quando o PIN fica travado depois de muitas. */
  pinFailedAttempts: integer("pin_failed_attempts").notNull().default(0),
  pinLockedUntil: integer("pin_locked_until", { mode: "timestamp" }),
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

/** Contadores de limite de uso (ex.: cadastros por IP), com janela que reinicia sozinha. */
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: integer("reset_at", { mode: "timestamp" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
