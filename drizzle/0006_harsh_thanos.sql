CREATE TABLE `payment_verifications` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`paymentIntentId` varchar(32) NOT NULL,
	`transactionHash` varchar(128) NOT NULL,
	`status` varchar(32) NOT NULL,
	`sender` varchar(64),
	`recipient` varchar(64),
	`valueLuna` int unsigned,
	`blockNumber` int unsigned,
	`confirmations` int unsigned,
	`networkId` int,
	`executionResult` boolean,
	`failureReason` varchar(64),
	`rawResponseJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `player_ratings` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`gameSlug` varchar(64) NOT NULL,
	`seasonId` varchar(32) NOT NULL,
	`rating` int NOT NULL DEFAULT 1000,
	`wins` int unsigned NOT NULL DEFAULT 0,
	`losses` int unsigned NOT NULL DEFAULT 0,
	`currentStreak` int unsigned NOT NULL DEFAULT 0,
	`bestStreak` int unsigned NOT NULL DEFAULT 0,
	`matchesPlayed` int unsigned NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `player_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `player_ratings_user_game_season_idx` UNIQUE(`userId`,`gameSlug`,`seasonId`)
);
--> statement-breakpoint
CREATE TABLE `rating_history` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`matchId` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`seasonId` varchar(32) NOT NULL,
	`gameSlug` varchar(64) NOT NULL,
	`previousRating` int NOT NULL,
	`ratingChange` int NOT NULL,
	`newRating` int NOT NULL,
	`opponentUserId` int NOT NULL,
	`opponentRating` int NOT NULL,
	`outcome` enum('win','loss','draw','abandoned_loss','abandoned_win') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rating_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `rating_history_match_user_idx` UNIQUE(`matchId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` varchar(32) NOT NULL,
	`number` int unsigned NOT NULL,
	`name` varchar(64) NOT NULL,
	`status` enum('upcoming','active','ended') NOT NULL DEFAULT 'active',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`),
	CONSTRAINT `seasons_number_idx` UNIQUE(`number`)
);
--> statement-breakpoint
ALTER TABLE `payment_intents` DROP INDEX `payment_intents_tx_hash_idx`;--> statement-breakpoint
ALTER TABLE `games` MODIFY COLUMN `kind` enum('ludo','connect4') NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `joinCode` varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_intents` MODIFY COLUMN `status` enum('created','confirmation_pending','submitted','verifying','verified','rejected','failed','expired','invalid','underpaid','wrong_recipient','duplicate','verification_failed') NOT NULL DEFAULT 'created';--> statement-breakpoint
ALTER TABLE `match_players` ADD `paymentIntentId` varchar(32);--> statement-breakpoint
ALTER TABLE `matches` ADD `seasonId` varchar(32) DEFAULT 'season-1' NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `winnerUserId` int;--> statement-breakpoint
ALTER TABLE `matches` ADD `loserUserId` int;--> statement-breakpoint
ALTER TABLE `matches` ADD `paymentIntentId` varchar(32);--> statement-breakpoint
ALTER TABLE `payment_intents` ADD `senderAddress` varchar(64);--> statement-breakpoint
ALTER TABLE `payment_intents` ADD `blockNumber` int unsigned;--> statement-breakpoint
ALTER TABLE `payment_intents` ADD `confirmations` int unsigned;--> statement-breakpoint
ALTER TABLE `payment_intents` ADD `networkId` int;--> statement-breakpoint
ALTER TABLE `payment_intents` ADD `verifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `match_players` ADD CONSTRAINT `match_players_payment_intent_idx` UNIQUE(`paymentIntentId`);--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_joinCode_unique` UNIQUE(`joinCode`);--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_payment_intent_idx` UNIQUE(`paymentIntentId`);--> statement-breakpoint
CREATE INDEX `payment_verifications_intent_idx` ON `payment_verifications` (`paymentIntentId`);--> statement-breakpoint
CREATE INDEX `payment_verifications_tx_hash_idx` ON `payment_verifications` (`transactionHash`);--> statement-breakpoint
CREATE INDEX `player_ratings_leaderboard_idx` ON `player_ratings` (`seasonId`,`gameSlug`,`rating`);--> statement-breakpoint
CREATE INDEX `rating_history_user_season_idx` ON `rating_history` (`userId`,`seasonId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `seasons_status_idx` ON `seasons` (`status`);--> statement-breakpoint
CREATE INDEX `matches_season_idx` ON `matches` (`seasonId`);--> statement-breakpoint
CREATE INDEX `matches_winner_idx` ON `matches` (`winnerUserId`);--> statement-breakpoint
CREATE INDEX `payment_intents_tx_hash_idx` ON `payment_intents` (`transactionHash`);