CREATE TABLE `games` (
	`id` varchar(32) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`kind` enum('ludo') NOT NULL,
	`status` enum('active','coming_soon','concept','unavailable') NOT NULL DEFAULT 'unavailable',
	`description` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `games_id` PRIMARY KEY(`id`),
	CONSTRAINT `games_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` varchar(32) NOT NULL,
	`gameId` varchar(32) NOT NULL,
	`hostUserId` int NOT NULL,
	`joinCode` varchar(12) NOT NULL,
	`visibility` enum('challenge_friend','public') NOT NULL DEFAULT 'challenge_friend',
	`status` enum('waiting','in_progress','finished','cancelled','expired') NOT NULL DEFAULT 'waiting',
	`engineVersion` varchar(16) NOT NULL,
	`stateVersion` int unsigned NOT NULL DEFAULT 0,
	`stateJson` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `matches_join_code_idx` UNIQUE(`joinCode`)
);
--> statement-breakpoint
CREATE INDEX `matches_game_idx` ON `matches` (`gameId`);--> statement-breakpoint
CREATE INDEX `matches_host_idx` ON `matches` (`hostUserId`);