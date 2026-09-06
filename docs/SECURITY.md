# Security

Nimiq Arena treats the browser as hostile input. The current frontend does not create user identities, balances, matches, or claims of online activity.

## Required controls before production money or multiplayer

| Threat                    | Required control                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Manipulated move          | Server-authoritative engine validates every command against a stored match version              |
| Duplicate request         | Client nonce plus server-side idempotency record                                                |
| Replay attack             | Expiring session tokens, command nonce, match version, and signed/authenticated session binding |
| Race condition            | Database transaction with optimistic version check or serialized match actor                    |
| Unauthorized match access | Authorization on every match read/write; never rely on hidden client routes                     |
| Payment manipulation      | Server-owned amount/recipient/payment intent; verify transaction hash and status independently  |
| Fake settlement           | Credit only after backend verification and defined confirmation policy                          |
| Disconnect                | Persisted snapshots, reconnect token, turn deadline, and deterministic timeout policy           |
| Abuse and spam            | Rate limiting, device identifier where appropriate, abuse telemetry, and moderation path        |
| RNG disputes              | Commit/reveal or auditable server-side randomness with an explicit fairness protocol            |

## Wallet security

Private keys must remain inside Nimiq Pay or the official wallet boundary. Arena must request only the operation it needs and display human-readable purpose and amount before approval. No secret, seed phrase, or private key may be requested from the client.

## Verified Blockchain & Payment Security Controls

1. **Authoritative Nimiq PoS (Albatross) JSON-RPC Verification**:
   - The backend queries public Nimiq JSON-RPC endpoints directly via `getTransactionByHash`.
   - Verification confirms:
     1. Transaction hash exists on-chain and is properly formatted (64-character hexadecimal).
     2. `executionResult === true` (no reverted transactions).
     3. Normalized recipient address (`normalizeNimiqAddress`) matches `NIMIQ_PAYMENT_RECIPIENT`.
     4. Value in Luna $\ge$ `NIMIQ_ARENA_ENTRY_VALUE_LUNA` (rejects underpaid transactions).
     5. Block confirmations $\ge 1$ (rejects unconfirmed mempool entries).
     6. Network ID matching (`5` for Testnet, `42` for Mainnet), against the network the deployment is configured for. RPC endpoint defaults and failover are chosen per network, so a mainnet verification is never answered by a testnet node. `env.ts` refuses to start on a network id that is neither, or on mainnet paired with a testnet endpoint.
     7. Recipient data carrying the payment intent id. Nimiq transfers hold no reference to what they were for, and the chain is public, so without this any transfer to the treasury could be claimed by whoever quoted its hash first. The payer's wallet writes the intent id into the transaction; a transfer bound to another intent, or to none, is refused (`data_mismatch`).

2. **Anti-Replay & Transaction Hash Uniqueness**:
   - A single on-chain transaction hash can only be claimed once across all payment intents and matches.
   - The duplicate check and the verified write happen in one transaction: a locking read serialises concurrent verifications of the same hash, so two requests submitting one hash cannot both pass the check while waiting on the network.
   - `payment_intents.verifiedTransactionHash` is a generated column holding the hash only while the intent is verified, under a unique index. That makes single-settlement a database invariant rather than an application check. Unverified intents hold NULL and may share a hash, so submitting a hash first on a throwaway intent cannot block the real payer from recording it.

3. **Match-Entry Payment Gating**:
   - Paid match entry requires a `verified` payment intent linked via `claimVerifiedPaymentForMatch`.
   - Unverified, underpaid, wrong-recipient, or expired intents are strictly rejected from entering matches.
   - Unique constraints on `match_players.paymentIntentId` and `matches.paymentIntentId` prevent payment intent double-spending.
   - A seat is priced from the match, not from the flat entry fee: `payment.createIntent` takes a `matchId` and charges that match's stake, and claiming refuses a deposit that does not cover the seat. The host's stake intent, created with the match, is reused rather than stranded.
   - Claiming requires the caller to hold a seat. The update previously matched zero rows for a non-participant and still reported success.
   - A wagered match stays in the waiting room until both stakes are verified; the second claim starts it. Joining no longer starts a wagered match, and a bot cannot fill a wagered seat, since a bot posts no stake and adding one would start the match around the gate.

4. **Match Scoping**:
   - Every match read and write is scoped to its participants through a single `requireMatchParticipant` guard: `getById`, `state`, `queueStatus`, `escrowDetails`, `settlePayout` and `triggerBotTurn`. Holding a session is not authorisation to read a match you are not in.
   - A player sees only their own transaction hash. The opponent's deposit status stays visible, since both sides need to watch escrow fill.

5. **Session Identity**:
   - `auth.guestLogin` mints the session subject server-side and never accepts one from the client. A caller-supplied or name-derived `openId` was sign-in as any account whose id could be guessed.

6. **Abuse Limits**:
   - Client identity for rate limiting comes from `req.ip`, which believes `X-Forwarded-For` only when `TRUST_PROXY` declares how many proxies sit in front. **Deployments behind a proxy must set it**; the default trusts nothing. The limiter store is capped and evicts oldest-first.
   - Beyond the global `/api` budget, session minting and payment procedures carry their own per-caller limits, keyed on user id (client address when anonymous).

7. **Immutable Audit Ledger**:
   - All verification attempts, raw RPC payloads, block numbers, and confirmation counts are permanently logged in `payment_verifications`.

## Implemented Ludo controls

Challenge codes are generated server-side, normalized before lookup, expire with the match, and cannot allocate a third seat. A host is inserted as seat 0 during the same transaction as match creation. Join requests are protected and idempotent for an already joined user.

Roll and move commands are accepted only from a joined participant. The server overwrites the player identity with the authenticated seat, validates the command through the shared engine, rejects stale state versions, and stores a unique nonce/event record. The optimistic version predicate prevents two concurrent commands from both advancing the same snapshot. The client board renders the returned snapshot and never decides turns, dice, legality, winners, ratings, or settlement.

The current browser synchronization mechanism is polling and manual refresh. It does not claim secure push presence, reconnect subscriptions, or abandoned-match cleanup; those remain required before production multiplayer.

## Reliability controls

Heartbeat and disconnect mutations require authenticated match participation; clients cannot mark another player disconnected or revive a non-participant. `lastSeenAt` is server-written and stale-player transitions occur at the lifecycle boundary.

SSE connections authorize the match participant before opening. Client reconnects cannot advance state because commands still require participant authorization, expected versions, and idempotency nonces. After reconnect, the persisted snapshot and state version are re-read; stale client state is never treated as authoritative.

Cleanup is cron-only and idempotent. It can expire matches past their expiry timestamp and cancel abandoned waiting or in-progress matches only after all participants have been disconnected beyond the configured grace period. No cleanup schedule is active until explicitly configured and verified.

## Competitive Integrity & Rating Safeguards

1. **Zero Client Authority Over Results**:
   - The client has no procedure or mechanism to report winner, score, rank, streak, or rating delta.
   - All outcomes originate strictly when the server engine determines a winner (`snapshot.winner !== null`) or when a match is declared abandoned by the server lifecycle sweep.
2. **Duplicate Settlement Prevention**:
   - Unique constraints on `rating_history(matchId, userId)` and `player_ratings(userId, gameSlug, seasonId)` guarantee rating is calculated exactly once per match.
   - Nonce replays return the stored event without recalculating ratings or incrementing win counters.
3. **Database-Backed Rankings**:
   - Leaderboard rankings are derived directly from indexed database records (`seasonId, gameSlug, rating DESC, wins DESC`).
   - No mock users, simulated players, or hardcoded ranks exist in production procedures.
