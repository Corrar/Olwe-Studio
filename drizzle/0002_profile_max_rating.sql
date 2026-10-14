ALTER TABLE `profiles` ADD `max_rating` integer DEFAULT 16 NOT NULL;--> statement-breakpoint
-- Perfis infantis já existentes começam com o limite infantil padrão (10 anos).
UPDATE `profiles` SET `max_rating` = 10 WHERE `is_kids` = 1;
