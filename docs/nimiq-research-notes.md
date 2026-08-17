# Nimiq Mini App Research Notes

Research date: 2026-08-17.

## Verified official guidance

The official Nimiq Developer Center states that Mini Apps are web applications running inside the Nimiq Pay app WebView. Wallet access is mediated by injected providers and the host app; sensitive operations require user approval through native dialogs, and private keys remain inside the wallet.

The current recommended Nimiq SDK pattern is:

```ts
import { init } from '@nimiq/mini-app-sdk'

const nimiq = await init({ timeout: 10_000 })
const accounts = await nimiq.listAccounts()
const consensus = await nimiq.isConsensusEstablished()
const blockNumber = await nimiq.getBlockNumber()
```

The official tutorial confirms the package name `@nimiq/mini-app-sdk`, the `init({ timeout: 10_000 })` initialization flow, and the need to expose the Vite development server to the network (`server.host: true`) when testing from Nimiq Pay.

The official overview lists Nimiq native support for NIM payments, message signing, and consensus checks. It also documents that Mini Apps may access Ethereum-compatible networks through `window.ethereum`, subject to Nimiq Pay support and user approval.

For this frontend-only milestone, no SDK integration or wallet operation is implemented. The UI must not claim wallet connection, balances, signing, payment, or settlement. Integration points should be represented by typed service boundaries and explicit NOT IMPLEMENTED status until the backend and production wallet flow are built.

## Sources

1. https://nimiq.dev/mini-apps/
2. https://nimiq.dev/mini-apps/tutorials/mini-app-tutorial
3. https://www.npmjs.com/package/@nimiq/mini-app-sdk
