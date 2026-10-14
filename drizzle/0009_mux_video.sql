ALTER TABLE `licensed_titles` ADD `mux_asset_id` text;--> statement-breakpoint
ALTER TABLE `licensed_titles` ADD `mux_signed` integer DEFAULT false NOT NULL;