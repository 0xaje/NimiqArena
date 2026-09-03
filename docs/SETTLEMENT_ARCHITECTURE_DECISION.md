# Nimiq Arena — Settlement & Payout Architecture Decision Record (ADR)

**Status:** Approved for Pilot Release  
**Date:** September 3, 2026  
**Context:** Payout and escrow architecture evaluation for competitive wagered matches on Nimiq Arena.

---

## 1. Context & Problem Statement

Nimiq Arena features competitive peer-to-peer matches where players can wager NIM (currently on Nimiq Testnet). While deposit verification is fully implemented and authoritatively verified against live Nimiq Testnet JSON-RPC nodes, the winner disbursement mechanism must be rigorously defined.

We must determine the safest, most transparent, and technically feasible settlement architecture while upholding our **Non-Negotiable Truth Policy** (no fake transaction hashes, no simulated confirmations, no mock explorer links).

---

## 2. Options Evaluated

### Option A: Testnet Ledger Pilot (Current Production Baseline)
* **Mechanism:**
  - Players submit real on-chain Testnet transactions for deposit/entry fees.
  - Server verifies transactions via live JSON-RPC queries.
  - Upon match completion, the winner's net pot (gross pot minus 2% protocol fee) is recorded authoritatively in the database ledger (`player_ratings`, `matches`, `rating_history`).
  - The settlement record states: `settlementStatus: "ledger_entitlement_confirmed"`, `payoutTxHash: null`, `explorerUrl: null`.
* **Advantages:**
  - Zero private key exposure risk (no server hot wallet holding funds).
  - 100% truthful: no false claims of automated disbursement.
  - Immune to server wallet draining or unauthorized broadcast attacks.
* **Limitations:**
  - Winner does not automatically receive NIM in their external wallet; pot is an off-chain ledger balance.
* **Verdict:** **ACCEPTED FOR PILOT / V1 RELEASE CANDIDATE**.

---

### Option B: Server Hot-Wallet Automated Payout Worker (Production Target)
* **Mechanism:**
  - An isolated background worker service holds an encrypted private key loaded exclusively via environment variables (`NIMIQ_PAYOUT_PRIVATE_KEY`).
  - Worker queries for matches in `finished` status with pending payouts.
  - Uses `@nimiq/core` to construct, sign, and broadcast an on-chain transaction from the hot wallet to the winner's verified address.
  - Records real transaction hash, monitors confirmation depth, and updates settlement status to `payout_confirmed`.
* **Mandatory Security Invariants:**
  1. *Key Isolation:* Private key never enters Git, never touches client bundles, and is never logged.
  2. *Strict Idempotency:* Database row lock + unique constraint prevents duplicate payouts (`ONE FINISHED MATCH → MAXIMUM ONE SUCCESSFUL PAYOUT`).
  3. *Balance Thresholds:* Hot wallet balance capped to low operational limits; alerts trigger on low balance.
  4. *Retry Safety:* Transient network failures mark payout as `payout_retry_pending` without double-signing.
* **Verdict:** **DEFERRED TO DEDICATED SECURITY & SIGNER DEPLOYMENT PHASE**. (Must not be partially implemented or faked).

---

### Option C: Trustless HTLC Smart Contract Escrow
* **Mechanism:**
  - Non-custodial on-chain Hashed Timelock Contract (HTLC) or native multisig contract where neither server nor player can unilaterally take funds without proof of game outcome.
* **Analysis:**
  - Nimiq Proof-of-Stake (Albatross) supports basic HTLC primitives primarily designed for cross-chain atomic swaps (Fastspot / OASIS).
  - General-purpose Turing-complete smart contracts (like EVM contracts) are not natively supported on Nimiq L1.
  - Building a custom cryptographic referee or multi-sig script requires deep protocol-level research and formal verification.
* **Verdict:** **REJECTED AS NOT IMPLEMENTED / NOT VIABLE IN CURRENT STACK**. (Claiming trustless smart contract escrow would violate our Truth Policy).

---

## 3. Authoritative Decision

1. **Active Standard:** Nimiq Arena operates under **Option A (Testnet Ledger Pilot)**.
2. **User Facing Transparency:**
   - The UI explicitly displays: *"Winner pot entitlement recorded authoritatively on Testnet ledger. Automated on-chain disbursement worker is pending production signer deployment."*
   - `payoutTxHash` remains `null`.
   - Explorer links remain hidden until real on-chain broadcast transactions exist.
3. **Transition to Option B:**
   - Option B will only be activated when a secure, audited, isolated hot-wallet worker with dedicated key management is deployed in a future security phase.
