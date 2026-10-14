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
    /** Muda quando a senha é trocada: as sessões abertas em outros aparelhos deixam de valer. */
    sessionVersion: integer("session_version").notNull().default(0),
    /** Conta criada com confirmação de e-mail obrigatória e ainda não confirmada. */
    emailVerificationPending: integer("email_verification_pending", { mode: "boolean" }).notNull().default(false),
    /** Quando o e-mail foi confirmado pelo link enviado no cadastro. */
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp" }),
    /** Último envio do e-mail de confirmação, para limitar reenvios. */
    verificationSentAt: integer("verification_sent_at", { mode: "timestamp" }),
    /** Até quando a conta tem o Olwe Premium (sem anúncios). Null ou no passado = Olwe Grátis. */
    premiumUntil: integer("premium_until", { mode: "timestamp" }),
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
    mediaType: text("media_type", { enum: ["movie", "tv", "archive", "commons", "licensed"] }).notNull(),
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
    mediaType: text("media_type", { enum: ["movie", "tv", "archive", "commons", "licensed"] }).notNull(),
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

/** Assinaturas do Premium no cartão (preapproval do Mercado Pago), uma por tentativa de assinar. */
export const subscriptions = sqliteTable("subscriptions", {
  /** ID da assinatura no Mercado Pago. */
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** pending, authorized, paused ou cancelled (como no Mercado Pago). */
  status: text("status").notNull(),
  /** Próxima cobrança informada pelo Mercado Pago. */
  nextPaymentAt: integer("next_payment_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  createdAt: createdAt(),
});

/** Pagamentos avulsos (Pix de 30 dias). credited impede somar os mesmos dias duas vezes. */
export const payments = sqliteTable("payments", {
  /** ID do pagamento no Mercado Pago. */
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  /** Dias de Premium que o pagamento dá. */
  days: integer("days").notNull(),
  credited: integer("credited", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

/**
 * Filmes com licença própria do Olwe (contrato, autorização do autor ou licença aberta), cadastrados no
 * painel /admin/titles. Só aparecem publicados e dentro da janela da licença.
 */
export const licensedTitles = sqliteTable("licensed_titles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  originalTitle: text("original_title"),
  overview: text("overview").notNull().default(""),
  year: text("year"),
  /** Duração em minutos. */
  runtime: integer("runtime"),
  /** Gêneros (ids do TMDB) em JSON, ex.: [16, 35]. */
  genreIds: text("genre_ids").notNull().default("[]"),
  poster: text("poster"),
  backdrop: text("backdrop"),
  /** Filme correspondente no TMDB (pôster, sinopse e elenco quando faltarem). */
  tmdbId: integer("tmdb_id"),
  /** Classificação indicativa (0 = livre, 10, 12, 14, 16). 18 não é aceito. */
  ageRating: integer("age_rating").notNull(),
  /** Motivos da classificação separados por vírgula ("Violência, Drogas"). */
  ratingDescriptors: text("rating_descriptors").notNull().default(""),
  /** file = arquivo de vídeo (MP4/WebM) tocado no player do Olwe; youtube = vídeo oficial no YouTube. */
  videoKind: text("video_kind", { enum: ["file", "youtube"] }).notNull(),
  /** URL do arquivo ou ID do vídeo no YouTube. */
  videoUrl: text("video_url").notNull(),
  /** Altura do vídeo em pixels (rótulo de qualidade). */
  videoHeight: integer("video_height"),
  /** free = Olwe Grátis (com anúncio antes) e Premium; premium = só assinantes. */
  tier: text("tier", { enum: ["free", "premium"] }).notNull().default("free"),
  /** Quem cedeu os direitos (distribuidora, produtora, autor). */
  licensor: text("licensor").notNull(),
  /** Tipo da licença exibido nos créditos ("Contrato de licenciamento", "CC BY 4.0"…). */
  licenseName: text("license_name").notNull(),
  /** Autoria e créditos exigidos pelo contrato ou pela licença. */
  credit: text("credit"),
  /** Janela da licença: fora dela o filme some sozinho. Null = sem limite. */
  licenseStart: integer("license_start", { mode: "timestamp" }),
  licenseEnd: integer("license_end", { mode: "timestamp" }),
  /** Anotações internas (contrato, contato, repasse). Nunca aparecem para o público. */
  notes: text("notes").notNull().default(""),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type LicensedTitle = typeof licensedTitles.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
