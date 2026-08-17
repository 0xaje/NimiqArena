# Nimiq Payment & On-Chain Verification Research

## 1. Verified Official Mini App Client Contract

The official Nimiq Provider API documents `sendBasicTransaction({ recipient, value, fee?, validityStartHeight? })`, returning a transaction hash string.
- **Denomination**: Luna (1 NIM = 100,000 Luna).
- **User Confirmation**: Managed natively inside Nimiq Pay. Documented errors: `PermissionDeniedError` (user cancelled/rejected) and `InvalidTransactionError` (malformed transaction data).
- **Client Trust Boundary**: The client provides only a candidate transaction hash. The client is NEVER trusted to declare payment success, transfer value, recipient matching, or match eligibility.

## 2. Verified Authoritative Nimiq PoS (Albatross) JSON-RPC Protocol

Authoritative blockchain verification is performed server-to-node using the official JSON-RPC 2.0 interface:
- **Public Endpoints**:
  - Testnet: `https://rpc.testnet.nimiqwatch.com` (Network ID: `5`)
  - Mainnet: `https://rpc.nimiqwatch.com` (Network ID: `42`)
- **JSON-RPC Method**: `getTransactionByHash`
  - Request: `{"jsonrpc": "2.0", "method": "getTransactionByHash", "params": ["<64-hex-hash>"], "id": 1}`
  - Response payload fields:
    - `hash`: String (64-character hexadecimal transaction hash).
    - `blockNumber`: Number (positive integer block height).
    - `timestamp`: Number (block timestamp in epoch milliseconds).
    - `confirmations`: Number ($\ge 1$ for included blocks).
    - `from`: String (Normalized Nimiq address of sender).
    - `to`: String (Normalized Nimiq address of recipient).
    - `value`: Number (transferred amount in Luna).
    - `fee`: Number (transaction fee in Luna).
    - `networkId`: Number (`5` for testnet, `42` for mainnet).
    - `executionResult`: Boolean (`true` for successful execution, `false` if reverted).

## 3. Server-Side Authoritative Verification Pipeline

1. **Existence & Format**: Checks that the transaction hash is a valid 64-character hex string and exists on the queried Nimiq PoS node.
2. **Revert Detection**: Checks `executionResult === true`.
3. **Recipient Address Equality**: Normalizes both expected and actual addresses (stripping whitespace, uppercase) to verify that funds were sent to the server-owned arena recipient.
4. **Amount Verification**: Confirms that `value >= expectedValueLuna`. Any underpayment is explicitly rejected (`underpaid`).
5. **Finality & Confirmation**: Verifies `confirmations >= 1`.
6. **Network Check**: Verifies `networkId` matches target environment.
7. **Single Consumption Guarantee**: Audits database to prevent transaction replay across multiple intents or players.

## 4. References

- [1]: https://nimiq.dev/mini-apps/api-reference/nimiq-provider "Nimiq Developer Center — Nimiq Provider API"
- [2]: https://www.nimiq.com/developers/mini-apps/overview "Nimiq Developer Center — Mini Apps overview"
- [3]: https://www.nimiq.com/developers/hub/ "Nimiq Developer Center — Nimiq Hub"
- [4]: https://rpc.testnet.nimiqwatch.com "Nimiq PoS Testnet Public JSON-RPC Node"
- [5]: https://rpc.nimiqwatch.com "Nimiq PoS Mainnet Public JSON-RPC Node"
