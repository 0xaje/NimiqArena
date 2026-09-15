CREATE TABLE `settlements` (
	`id` varchar(32) NOT NULL,
	`matchId` varchar(32) NOT NULL,
	`winnerUserId` int NOT NULL,
	`winnerAddress` varchar(64) NOT NULL,
	`totalPotLuna` bigint NOT NULL,
	`winnerAmountLuna` bigint NOT NULL,
	`builderAmountLuna` bigint NOT NULL,
	`ecosystemAmountLuna` bigint NOT NULL,
	`charityAmountLuna` bigint NOT NULL,
	`referrerAmountLuna` bigint NOT NULL,
	`referrerAddress` varchar(64),
	`referrerUserId` int,
	`referralEligible` boolean NOT NULL DEFAULT false,
	`status` enum('pending','disbursing','settled_on_chain','settlement_failed','ledger_entitlement_confirmed') NOT NULL DEFAULT 'pending',
	`payoutTxHash` varchar(128),
	`payoutBlockNumber` int unsigned,
	`settledAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `settlements_match_idx` UNIQUE(`matchId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `address` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `points` int DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `referralCode` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `referredByUserId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `referralEarningsNim` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `evmAddress` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `welcomeClaimed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_address_idx` UNIQUE(`address`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_referral_code_idx` UNIQUE(`referralCode`);--> statement-breakpoint
CREATE INDEX `settlements_winner_idx` ON `settlements` (`winnerUserId`);--> statement-breakpoint
CREATE INDEX `settlements_status_idx` ON `settlements` (`status`);