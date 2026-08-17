# Ludo Game Engine

## Current status

The current board is a responsive presentation preview. It demonstrates the visual hierarchy, player areas, pieces, dice interaction, turn indicator, and exit flow. It is not a real multiplayer game and does not calculate authoritative moves.

## Production requirements

The production engine must be a deterministic, pure domain module with no React or browser dependencies. A match snapshot should include a versioned ruleset, turn number, active player, remaining turn deadline, piece positions, dice roll, and event sequence number.

Every move must be sent as an intent to the server. The server must validate the player, match membership, turn, deadline, dice result, piece position, and legal move set before committing the next snapshot. The client may animate an accepted transition, but it may not decide whether a move is legal or whether a match has ended.

Randomness must be designed for fair play. A production design should use auditable server-side randomness with a committed seed or equivalent verifiable scheme, protect the seed until reveal, and persist the roll event with the match sequence. The exact scheme requires a separate security review before ranked or monetary play.

## Reconnection

A reconnecting client must receive the latest authoritative snapshot and event cursor. Local animation state is disposable. Duplicate commands must be rejected or safely deduplicated using a command identifier, and stale commands must not mutate the match.

## Test plan

The future engine requires table-driven tests for home entry, safe squares, captures, exact finishing rolls, blocked moves, turn expiry, invalid commands, duplicate commands, reconnect snapshots, and deterministic replay from an event log.
