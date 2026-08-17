CREATE TABLE `match_events` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`matchId` varchar(32) NOT NULL,
	`version` int unsigned NOT NULL,
	`userId` int NOT NULL,
	`commandNonce` varchar(64) NOT NULL,
	`commandJson` text NOT NULL,
	`eventJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_events_match_version_idx` UNIQUE(`matchId`,`version`),
	CONSTRAINT `match_events_match_nonce_idx` UNIQUE(`matchId`,`commandNonce`)
);
--> statement-breakpoint
CREATE TABLE `match_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`seat` int unsigned NOT NULL,
	`status` enum('joined','disconnected','left') NOT NULL DEFAULT 'joined',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `match_players_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_players_match_user_idx` UNIQUE(`matchId`,`userId`),
	CONSTRAINT `match_players_match_seat_idx` UNIQUE(`matchId`,`seat`)
);
--> statement-breakpoint
CREATE INDEX `match_players_match_idx` ON `match_players` (`matchId`);--> statement-breakpoint
CREATE INDEX `match_players_user_idx` ON `match_players` (`userId`);