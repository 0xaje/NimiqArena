# Security

Nimiq Arena treats the browser as an untrusted client. The current milestone follows that rule by keeping all preview data isolated and refusing to simulate wallet operations.

Before production launch, the backend must authenticate the player, authorize match membership, validate every command against the server snapshot, enforce sequence numbers and idempotency keys, and rate-limit room creation, matchmaking, and command submission. Match outcomes, rating changes, rewards, and transaction states must be written by trusted services only.

Payment handling must separate intent creation from settlement. The server must verify the expected recipient, amount, network, transaction reference, and confirmation policy. A client-side "success" event must never finalize a reward. Pending and failed payments need explicit states and reconciliation jobs.

The realtime layer must reject events for unauthorized rooms, handle duplicate delivery, and resynchronize after reconnect. Secrets, signing material, and provider credentials must remain outside the browser. Logs should avoid sensitive wallet information while preserving enough identifiers to investigate disputes.

The security review must cover dependency scanning, content security policy, abuse prevention, botting and collusion, replay attacks, race conditions, denial of service, and the operational recovery path when the blockchain or realtime service is unavailable.
