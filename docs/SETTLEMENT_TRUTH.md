# Nimiq Arena — Settlement & Payment Truth Specification

This document provides a truthful, technically precise disclosure of the payment, deposit, and settlement capabilities currently implemented in Nimiq Arena.

In accordance with our **Non-Negotiable Truth Policy**, this document distinguishes between what is verified against the real Nimiq blockchain, what is recorded in our database ledger, and what remains unbuilt.

---

## 1. Summary Status Matrix

| Capability | Category | Implementation State | Verification Method |
| :--- | :--- | :--- | :--- |
| **Testnet Deposit Verification** | **VERIFIED NOW** | Live JSON-RPC against Nimiq PoS Testnet nodes | Automated tests (`server/payment-verifier.integration.test.ts`) & live RPC queries |
| **Transaction Format & Anti-Replay** | **VERIFIED NOW** | Hash validation, hex decoding, address normalization, database unique constraints | Automated tests (`server/nimiq-verifier.test.ts`) |
| **Winner Pot Entitlement** | **LEDGER ONLY** | Database recording of match victory pot entitlement (`settlementStatus: "ledger_entitlement_confirmed"`) | Database persistence & tRPC query (`match.settlePayout`) |
| **Hot-Wallet On-Chain Payout Worker** | **NOT IMPLEMENTED** | Automated disbursement worker to sign and broadcast NIM to winner address | **NOT IMPLEMENTED** (Pending production HSM/signer architecture) |
| **Trustless Smart Contract Escrow** | **NOT IMPLEMENTED** | Native Nimiq Hashed Time-Locked Contracts (HTLC) or multi-sig escrow | **NOT IMPLEMENTED** (Custodial/pilot model currently used) |
| **Refund Worker on Cancellation** | **NOT IMPLEMENTED** | Automated on-chain refund to depositors when match is abandoned | **NOT IMPLEMENTED** (Manual admin intervention required) |

---

## 2. Detailed Tier Disclosures

### A. VERIFIED NOW (Executes Live Against Nimiq Blockchain)

The following pipeline executes against real Nimiq PoS nodes via JSON-RPC:

1. **Payment Intent Creation**:
   - The server creates a payment intent tied to a specific match, user, and stake amount (in Luna).
   - Generates an immutable tracking ID and assigns the configured protocol recipient address.
2. **On-Chain Transaction Verification (`server/nimiq-verifier.ts`)**:
   - Queries real Nimiq Testnet RPC endpoint (`https://rpc.testnet.nimiq.watch` or configured node).
   - Validates that the submitted transaction hash actually exists in a mined block.
   - Verifies that `recipientAddress === ENV.NIMIQ_PAYMENT_RECIPIENT`.
   - Verifies that `valueLuna >= requiredStakeLuna`.
   - Verifies that `networkId === 5` (Nimiq Testnet).
3. **Anti-Replay Gating**:
   - Ensures a single transaction hash cannot be submitted twice across any payment intent or match entry.
   - Database unique index on `payment_intents(tx_hash)` enforces zero double-spending.

---

### B. LEDGER ONLY (Internal Database Records)

The following actions occur purely within the MariaDB/MySQL database and do **NOT** move blockchain tokens:

1. **Match Entry Confirmation**:
   - When a player verifies their deposit, their status in `match_players` transitions from `pending_deposit` to `joined`.
   - The match transitions to `in_progress` once both seats are verified.
2. **Pot Entitlement Recording (`server/db.ts:settleMatchWinnerPayout`)**:
   - When an escrow match finishes, the server calculates:
     - `grossPotNim = stakeNim * 2`
     - `protocolFeeNim = grossPotNim * 0.02` (2%)
     - `netPayoutNim = grossPotNim - protocolFeeNim`
   - The server marks the winner's entitlement in the database ledger with:
     - `settlementStatus: "ledger_entitlement_confirmed"`
     - `payoutTxHash: null`
     - `explorerUrl: null`
3. **UI Representation (`VictoryPayoutBanner.tsx`)**:
   - Truthfully displays: *"NIMIQ TESTNET PILOT ESCROW — Ledger Entitlement Recorded"*.
   - Explains that the entitlement is held in the application database and that automated hot-wallet disbursement is under development.

---

### C. NOT IMPLEMENTED (Required for Mainnet Production)

The following components must be built and audited before real-money Mainnet launch:

1. **Automated Disbursement Worker**:
   - An isolated background worker process with secure key-management (HSM, AWS KMS, or Vault).
   - Polls `matches` with `settlementStatus === "ledger_entitlement_confirmed"` and `payoutTxHash IS NULL`.
   - Signs and broadcasts an authoritative payout transaction of `netPayoutNim` Luna to the winner's Nimiq address.
   - Updates `matches` with the genuine on-chain `payoutTxHash`.
2. **Automated Refund Worker**:
   - In cases where a match is cancelled or abandoned after one player deposits, refunds the deposited stake to the original sender address minus network gas fees.
3. **Non-Custodial Escrow**:
   - Migration from centralized treasury deposit tracking to native Nimiq HTLCs or multi-signature escrow contracts if decentralized guarantees are required.

---

## 3. Truth In UI Guidelines

- **No Fake Hashes**: The codebase must never generate random string hashes (e.g. `0x${nanoid()}`) to simulate blockchain transactions.
- **No Simulated Explorer Links**: Links to `nimiq.watch` or block explorers must only be rendered when a genuine on-chain transaction hash exists.
- **Labeling**: All wagered experiences are labeled as *"Nimiq Testnet Pilot"*.
