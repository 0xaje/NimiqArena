ALTER TABLE `payment_intents` MODIFY COLUMN `valueLuna` bigint unsigned NOT NULL;
ALTER TABLE `payment_verifications` MODIFY COLUMN `valueLuna` bigint unsigned NULL;
