# Nimiq Integration

## Current status

Nimiq wallet, account, signing, payment, and settlement functionality is **NOT IMPLEMENTED** in this milestone. No wallet connection, balance, transaction, or payment success is simulated.

## Official integration facts

Nimiq Mini Apps run inside the Nimiq Pay WebView and communicate with the host through injected providers. The official SDK package is `@nimiq/mini-app-sdk`; the documented initialization pattern is `init({ timeout: 10_000 })`, followed by provider calls such as `listAccounts()`, `isConsensusEstablished()`, and `getBlockNumber()`.[^1] [^2]

Sensitive wallet actions are mediated by Nimiq Pay and require user approval. Private keys remain in the wallet and must never be exposed to the Mini App.[^1]

## Planned implementation

The eventual adapter should initialize the SDK only when the app is running in the supported Mini App environment, expose connection and account state through a typed provider, and treat every payment as a user-approved intent whose final state is verified by the backend against the Nimiq network. A frontend callback or optimistic UI event will not be treated as settlement.

Any competitive entry fee must have an explicit payment intent, a server-generated idempotency key, a verified transaction reference, and a timeout/reconciliation path for rejected, pending, or replaced transactions. The detailed reviewed design is documented in `docs/NIMIQ_WALLET_PAYMENT_ARCHITECTURE.md`, including the account-authentication challenge, payment-intent state machine, RPC verification boundary, and failure-handling rules.

## References

[^1]: [Nimiq Developer Center — Mini Apps](https://nimiq.dev/mini-apps/)
[^2]: [Nimiq Developer Center — Build Your First Mini App](https://nimiq.dev/mini-apps/tutorials/mini-app-tutorial)
