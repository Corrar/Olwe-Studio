-- O ID do título passa a ser texto para aceitar identificadores do Internet Archive.
-- Recria as tabelas (SQLite não altera colunas de chave primária) preservando os dados.
CREATE TABLE `__new_watchlist` (
	`profile_id` text NOT NULL,
	`media_type` text NOT NULL,
	`tmdb_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`profile_id`, `media_type`, `tmdb_id`),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_watchlist` (`profile_id`, `media_type`, `tmdb_id`, `created_at`)
	SELECT `profile_id`, `media_type`, CAST(`tmdb_id` AS TEXT), `created_at` FROM `watchlist`;
--> statement-breakpoint
DROP TABLE `watchlist`;
--> statement-breakpoint
ALTER TABLE `__new_watchlist` RENAME TO `watchlist`;
--> statement-breakpoint
CREATE TABLE `__new_progress` (
	`profile_id` text NOT NULL,
	`media_type` text NOT NULL,
	`tmdb_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`profile_id`, `media_type`, `tmdb_id`),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_progress` (`profile_id`, `media_type`, `tmdb_id`, `position`, `duration`, `updated_at`)
	SELECT `profile_id`, `media_type`, CAST(`tmdb_id` AS TEXT), `position`, `duration`, `updated_at` FROM `progress`;
--> statement-breakpoint
DROP TABLE `progress`;
--> statement-breakpoint
ALTER TABLE `__new_progress` RENAME TO `progress`;
