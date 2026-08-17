# Database Schema Documentation

## Core Tables

### 1. `users`

- `id`: INT AUTO_INCREMENT PRIMARY KEY
- `openId`: VARCHAR(64) NOT NULL UNIQUE
- `name`: TEXT NULL
- `email`: VARCHAR(320) NULL
- `loginMethod`: VARCHAR(64) NULL
- `role`: ENUM('user', 'admin') NOT NULL DEFAULT 'user'
- `createdAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `lastSignedIn`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

### 2. `games`

- `id`: VARCHAR(32) PRIMARY KEY
- `slug`: VARCHAR(64) NOT NULL UNIQUE
- `name`: VARCHAR(128) NOT NULL
- `kind`: ENUM('ludo') NOT NULL
- `status`: ENUM('active', 'coming_soon', 'concept', 'unavailable') NOT NULL DEFAULT 'unavailable'
- `description`: TEXT NOT NULL
- `createdAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### 3. `seasons`

- `id`: VARCHAR(32) PRIMARY KEY (e.g. `'season-1'`)
- `number`: INT UNSIGNED NOT NULL UNIQUE
- `name`: VARCHAR(64) NOT NULL
- `status`: ENUM('upcoming', 'active', 'ended') NOT NULL DEFAULT 'active'
- `startsAt`: TIMESTAMP NOT NULL
- `endsAt`: TIMESTAMP NOT NULL
- `createdAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- _Indexes_: `status`

### 4. `matches`

- `id`: VARCHAR(32) PRIMARY KEY
- `gameId`: VARCHAR(32) NOT NULL
- `seasonId`: VARCHAR(32) NOT NULL DEFAULT 'season-1'
- `hostUserId`: INT NOT NULL
- `winnerUserId`: INT NULL
- `loserUserId`: INT NULL
- `joinCode`: VARCHAR(12) NOT NULL UNIQUE
- `visibility`: ENUM('challenge_friend', 'public') NOT NULL DEFAULT 'challenge_friend'
- `status`: ENUM('waiting', 'in_progress', 'finished', 'cancelled', 'expired') NOT NULL DEFAULT 'waiting'
- `engineVersion`: VARCHAR(16) NOT NULL
- `stateVersion`: INT UNSIGNED NOT NULL DEFAULT 0
- `stateJson`: TEXT NOT NULL
- `expiresAt`: TIMESTAMP NOT NULL
- `createdAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- _Indexes_: `gameId`, `seasonId`, `hostUserId`, `winnerUserId`, `joinCode` (unique)

### 5. `match_players`

- `id`: INT AUTO_INCREMENT PRIMARY KEY
- `matchId`: VARCHAR(32) NOT NULL
- `userId`: INT NOT NULL
- `seat`: INT UNSIGNED NOT NULL
- `status`: ENUM('joined', 'disconnected', 'left') NOT NULL DEFAULT 'joined'
- `joinedAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `lastSeenAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- _Indexes_: `matchId`, `userId`, `(matchId, userId)` (unique), `(matchId, seat)` (unique)

### 6. `match_events`

- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `matchId`: VARCHAR(32) NOT NULL
- `version`: INT UNSIGNED NOT NULL
- `userId`: INT NOT NULL
- `commandNonce`: VARCHAR(64) NOT NULL
- `commandJson`: TEXT NOT NULL
- `eventJson`: TEXT NOT NULL
- `snapshotJson`: TEXT NOT NULL
- `resultStatus`: VARCHAR(32) NOT NULL
- `createdAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- _Indexes_: `(matchId, version)` (unique), `(matchId, commandNonce)` (unique)

### 7. `player_ratings`

- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `userId`: INT NOT NULL
- `gameSlug`: VARCHAR(64) NOT NULL
- `seasonId`: VARCHAR(32) NOT NULL
- `rating`: INT NOT NULL DEFAULT 1000
- `wins`: INT UNSIGNED NOT NULL DEFAULT 0
- `losses`: INT UNSIGNED NOT NULL DEFAULT 0
- `currentStreak`: INT UNSIGNED NOT NULL DEFAULT 0
- `bestStreak`: INT UNSIGNED NOT NULL DEFAULT 0
- `matchesPlayed`: INT UNSIGNED NOT NULL DEFAULT 0
- `updatedAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- _Indexes_: `(userId, gameSlug, seasonId)` (unique), `(seasonId, gameSlug, rating)`

### 8. `rating_history`

- `id`: INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `matchId`: VARCHAR(32) NOT NULL
- `userId`: INT NOT NULL
- `seasonId`: VARCHAR(32) NOT NULL
- `gameSlug`: VARCHAR(64) NOT NULL
- `previousRating`: INT NOT NULL
- `ratingChange`: INT NOT NULL
- `newRating`: INT NOT NULL
- `opponentUserId`: INT NOT NULL
- `opponentRating`: INT NOT NULL
- `outcome`: ENUM('win', 'loss', 'draw', 'abandoned_loss', 'abandoned_win') NOT NULL
- `createdAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- _Indexes_: `(matchId, userId)` (unique), `(userId, seasonId, createdAt)`

### 9. `payment_intents`

- `id`: VARCHAR(32) PRIMARY KEY
- `userId`: INT NOT NULL
- `recipient`: VARCHAR(64) NOT NULL
- `valueLuna`: INT UNSIGNED NOT NULL
- `status`: ENUM('created', 'confirmation_pending', 'submitted', 'verified', 'rejected', 'failed', 'expired') NOT NULL DEFAULT 'created'
- `clientNonce`: VARCHAR(64) NOT NULL
- `transactionHash`: VARCHAR(128) NULL
- `failureCode`: VARCHAR(64) NULL
- `expiresAt`: TIMESTAMP NOT NULL
- `createdAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- _Indexes_: `userId`, `(userId, clientNonce)` (unique), `transactionHash` (unique)
