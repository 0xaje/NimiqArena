# NIM Payment API Research

## Verified official Mini App contract

The current official Nimiq Provider API documents `sendBasicTransaction({ recipient, value, fee?, validityStartHeight? })`, returning a transaction hash string. The `value` is denominated in Luna, where 1 NIM equals 100,000 Luna. The method requires user confirmation in Nimiq Pay and documents `PermissionDeniedError` for a rejected confirmation and `InvalidTransactionError` for malformed transaction data.

The method is exposed through the provider returned by the official Mini App SDK `init()` helper. It is a direct user-approved transaction request, not a backend payment-intent API. Therefore Arena must wrap it in an application-owned intent lifecycle: the backend creates an intent with a server-owned recipient and amount, the client requests the exact approved transaction through Nimiq Pay, and the backend verifies the returned transaction hash before marking the intent settled.

## References

[1]: https://nimiq.dev/mini-apps/api-reference/nimiq-provider "Nimiq Developer Center — Nimiq Provider API"
[2]: https://www.nimiq.com/developers/mini-apps/overview "Nimiq Developer Center — Mini Apps overview"
[3]: https://www.nimiq.com/developers/hub/ "Nimiq Developer Center — Nimiq Hub"
