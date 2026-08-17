# Nimiq Wallet and Payment Review Notes

Review date: 2026-08-17.

The current Nimiq Mini App SDK guidance confirms that a Mini App should call `init()` from `@nimiq/mini-app-sdk` and then use the injected Nimiq provider. `listAccounts()` returns user-friendly Nimiq addresses and requires user confirmation. `sign()` returns `{ publicKey, signature }` and also requires confirmation. `isConsensusEstablished()` and `getBlockNumber()` are non-confirmation network-read methods.

For payments, the official provider exposes `sendBasicTransaction({ recipient, value, fee?, validityStartHeight? })` and `sendBasicTransactionWithData({ recipient, value, fee?, data, validityStartHeight? })`. The value is specified in Luna, with 100,000 Luna equal to 1 NIM. Both methods require user confirmation and return a transaction hash. Documented errors include permission denial and invalid transaction data.

The official RPC method catalogue includes `getTransactionByHash`, transaction lookups by address, block and batch transaction queries, mempool methods, block retrieval, and head-block subscriptions. These support a backend-side verification and reconciliation worker, but the exact confirmation/finality policy must be defined against the current Nimiq network rules before monetary launch.

Official sources:

1. https://nimiq.dev/mini-apps/api-reference/nimiq-provider
2. https://nimiq.dev/mini-apps/
3. https://nimiq.dev/rpc/methods/
