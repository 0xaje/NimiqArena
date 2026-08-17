# Nimiq Integration

## Current status

The frontend uses the official `@nimiq/mini-app-sdk` package and the documented `init({ timeout })` flow. It detects whether the app is running inside Nimiq Pay, requests a real account only after a user action, and displays the returned address when the provider returns one. The browser preview never fabricates an address, balance, transaction, or connected state.

The payment flow now creates an authenticated, idempotent server-owned payment intent through tRPC. The server supplies the recipient and entry amount from configuration; the client cannot choose either value. The client marks the intent confirmation-pending, calls the official `nimiq.sendBasicTransaction({ recipient, value })` method, records only the returned transaction hash as submitted, and displays that settlement is still pending server-side verification. Provider rejection and malformed transaction errors are recorded as rejected or failed; no client response can mark an intent verified.

## Verified official API surface

The official Mini Apps overview describes Mini Apps as web applications running inside Nimiq Pay, with provider access mediated by an injected host API. The documented SDK entry point is `init()`, and the first-party examples use `listAccounts()`, `isConsensusEstablished()`, and `getBlockNumber()` [1]. The first-app tutorial documents installation of `@nimiq/mini-app-sdk` and the same provider initialization path [2].

The official Hub documentation separately documents `@nimiq/hub-api` and `checkout()` for requesting a payment, with the example returning a transaction hash after user approval [3]. Arena has not wired Hub checkout because the current project is frontend-only and has no trusted match/payment service or configured recipient policy.

| Capability | Official reference | Arena status |
|---|---|---|
| Detect Nimiq Pay provider | `init({ timeout })` | Implemented in frontend |
| Request Nimiq accounts | `listAccounts()` | Implemented behind user action |
| Read consensus/block height | `isConsensusEstablished()`, `getBlockNumber()` | Not exposed in UI yet |
| Sign a message | `sign()` | Not implemented; no auth protocol yet |
| Request NIM payment | Mini App provider `sendBasicTransaction({ recipient, value })` | Implemented behind server-owned intent and Nimiq Pay confirmation |
| Confirm transaction on-chain | Backend indexer/node/API | Not implemented; submitted hashes remain unverified |
| Matchmaking and settlement | Server-authoritative backend | Not implemented |

## Required next integration sequence

1. Add a backend service with authenticated sessions, match IDs, payment intents, idempotency keys, and a durable transaction state machine.
2. Define the NIM escrow and payout policy, including recipient addresses, fees, refund rules, timeout behavior, and network selection.
3. Implement the official payment request after the backend creates an intent; never trust a client-provided amount or recipient.
4. Verify the returned transaction hash server-side before crediting a match.
5. Reconcile confirmations, failures, rejected prompts, duplicate requests, and user disconnects.

## References

[1]: https://www.nimiq.com/developers/mini-apps/overview "Nimiq Developer Center — Mini Apps overview"
[2]: https://www.nimiq.com/developers/mini-apps/mini-app-tutorial "Nimiq Developer Center — Build Your First Nimiq Mini App"
[3]: https://www.nimiq.com/developers/hub/ "Nimiq Developer Center — Nimiq Hub"
