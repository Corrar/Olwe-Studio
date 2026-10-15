CREATE TABLE `charges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`method` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`fee_cents` integer,
	`paid_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `charges_paid_at_idx` ON `charges` (`paid_at`);--> statement-breakpoint
CREATE TABLE `daily_activity` (
	`day` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`day`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `title_stats` (
	`day` text NOT NULL,
	`media_type` text NOT NULL,
	`item_id` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`watch_seconds` integer DEFAULT 0 NOT NULL,
	`ad_impressions` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `media_type`, `item_id`)
);
--> statement-breakpoint
ALTER TABLE `licensed_titles` ADD `cost_model` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `licensed_titles` ADD `cost_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `licensed_titles` ADD `revenue_share` integer DEFAULT 0 NOT NULL;