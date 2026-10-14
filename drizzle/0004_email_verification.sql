ALTER TABLE `users` ADD `email_verified_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `verification_sent_at` integer;--> statement-breakpoint
-- Contas criadas antes da confirmação por e-mail continuam com acesso.
UPDATE `users` SET `email_verified_at` = unixepoch() WHERE `email_verified_at` IS NULL;
