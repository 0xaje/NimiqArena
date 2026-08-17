# Nimiq Integration

## Current status

The frontend SDK adapter is now implemented behind `NimiqMiniAppWallet`. It uses the official `@nimiq/mini-app-sdk` package for provider initialization, account discovery, challenge signing, and user-approved NIM transaction submission. Backend session creation, signature verification, payment-intent creation, transaction verification, settlement, balances, and match unlocking remain **NOT IMPLEMENTED** because the repository still has no backend or RPC verifier. No wallet connection, balance, transaction, or payment success is fabricated.

## Official integration facts

Nimiq Mini Apps run inside the Nimiq Pay WebView and communicate with the host through injected providers. The official SDK package is `@nimiq/mini-app-sdk`; the documented initialization pattern is `init({ timeout: 10_000 })`, followed by provider calls such as `listAccounts()`, `isConsensusEstablished()`, and `getBlockNumber()`.[^1] [^2]

Sensitive wallet actions are mediated by Nimiq Pay and require user approval. Private keys remain in the wallet and must never be exposed to the Mini App.[^1]

## Planned implementation

The adapter now initializes the SDK only when an operation requires the provider and exposes typed wallet state through `src/types/nimiq.ts`. `src/services/arenaApi.ts` provides typed calls for backend auth challenges, session creation, payment intents, hash submission, and payment-state reads. The frontend treats a provider-returned transaction hash as `submitted`; only a future backend verifier may transition an intent to `verified` and unlock a match. A frontend callback or optimistic UI event is never treated as settlement.

Any competitive entry fee must have an explicit payment intent, a server-generated idempotency key, a verified transaction reference, and a timeout/reconciliation path for rejected, pending, or replaced transactions. The detailed reviewed design is documented in `docs/NIMIQ_WALLET_PAYMENT_ARCHITECTURE.md`, including the account-authentication challenge, payment-intent state machine, RPC verification boundary, and failure-handling rules.

## References

[^1]: [Nimiq Developer Center — Mini Apps](https://nimiq.dev/mini-apps/)
[^2]: [Nimiq Developer Center — Build Your First Mini App](https://nimiq.dev/mini-apps/tutorials/mini-app-tutorial)

## Implemented frontend code

The current frontend integration is split into four layers:

| File | Role |
|---|---|
| `src/types/nimiq.ts` | Wallet snapshot, signed challenge, payment intent, and submission contracts |
| `src/services/nimiqWallet.ts` | Real `@nimiq/mini-app-sdk` provider adapter |
| `src/services/arenaApi.ts` | Typed HTTP client for future Arena auth and payment endpoints |
| `src/services/nimiqArenaClient.ts` | Orchestrates challenge authentication and payment-intent submission |
| `src/hooks/useNimiqWallet.ts` | React-facing wallet state and action hook |

The adapter calls `listAccounts()`, `sign()`, `sendBasicTransaction()`, and `sendBasicTransactionWithData()` only through the official provider returned by `init()`. It validates local intent preconditions, but it does not verify signatures, inspect the blockchain, or turn a transaction hash into a verified payment. Those actions remain backend responsibilities.
