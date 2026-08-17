CREATE TABLE `payment_intents` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`recipient` varchar(64) NOT NULL,
	`valueLuna` int unsigned NOT NULL,
	`status` enum('created','confirmation_pending','submitted','verified','rejected','failed','expired') NOT NULL DEFAULT 'created',
	`clientNonce` varchar(64) NOT NULL,
	`transactionHash` varchar(128),
	`failureCode` varchar(64),
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_intents_user_nonce_idx` UNIQUE(`userId`,`clientNonce`),
	CONSTRAINT `payment_intents_tx_hash_idx` UNIQUE(`transactionHash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `payment_intents_user_idx` ON `payment_intents` (`userId`);