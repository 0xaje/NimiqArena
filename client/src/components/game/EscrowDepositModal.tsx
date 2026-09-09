import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";
import {
  ShieldCheck,
  Coins,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Copy,
  ExternalLink,
  Wallet,
  Sparkles,
  Check,
} from "lucide-react";
import { createPaymentNonce } from "@/lib/payment-state";
import {
  sendNimiqPayment,
  getActiveWalletAddress,
  fetchNimiqBalance,
  formatNimiqAddress,
} from "@/lib/nimiq-wallet";

interface EscrowDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  stakeNim: number;
  onDepositSuccess: () => void;
}

export function EscrowDepositModal({
  isOpen,
  onClose,
  matchId,
  stakeNim,
  onDepositSuccess,
}: EscrowDepositModalProps) {
  useModalBackHandler(isOpen, onClose);
  const utils = trpc.useUtils();
  const [step, setStep] = useState<
    "idle" | "creating" | "paying" | "verifying" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const activeWallet = getActiveWalletAddress();

  React.useEffect(() => {
    if (isOpen && activeWallet) {
      setIsLoadingBalance(true);
      fetchNimiqBalance(activeWallet)
        .then(bal => setUserBalance(bal))
        .catch(() => {})
        .finally(() => setIsLoadingBalance(false));
    }
  }, [isOpen, activeWallet]);

  const createIntent = trpc.payment.createIntent.useMutation();
  const markPending = trpc.payment.markConfirmationPending.useMutation();
  const submitTx = trpc.payment.submitTransaction.useMutation();
  const verifyPayment = trpc.payment.verify.useMutation();
  const claimPayment = trpc.match.claimPayment.useMutation();

  if (!isOpen) return null;

  // Display only. stakeNim comes from the match's root intent via
  // escrowDetails, so this matches what the server will price the seat at;
  // the amount actually charged is whatever createIntent returns.
  const lunaValue = Math.floor(stakeNim * 100_000);


  const handleStartDeposit = async () => {
    try {
      setStep("creating");
      setErrorMessage("");

      // 1. Create payment intent
      const nonce = createPaymentNonce();
      const intentRes = await createIntent.mutateAsync({
        clientNonce: nonce,
        // Server prices the seat from the match's stake; the modal pays
        // whatever it returns rather than assuming the flat entry fee.
        matchId,
      });
      const intent = intentRes;

      setStep("paying");
      await markPending.mutateAsync({ id: intent.id });

      // 2. Authorize real on-chain transaction via Nimiq Pay or Nimiq Hub
      const realTxHash = await sendNimiqPayment({
        recipient: intent.recipient,
        valueLuna: intent.valueLuna,
        // Binds the transfer to this intent; the server rejects it otherwise.
        data: intent.id,
      });

      setTxHash(realTxHash);

      await submitTx.mutateAsync({
        id: intent.id,
        transactionHash: realTxHash,
      });

      // 3. Verify on-chain authoritatively
      setStep("verifying");
      const verifyRes = await verifyPayment.mutateAsync({ id: intent.id });

      if (verifyRes.intent.status !== "verified") {
        throw new Error(
          `Payment status was ${verifyRes.intent.status}. Expected verified.`
        );
      }

      // 4. Claim verified payment for match seat
      await claimPayment.mutateAsync({
        matchId,
        paymentIntentId: intent.id,
      });

      setStep("success");
      toast.success("Stake Escrow Locked Successfully!");
      await utils.match.escrowDetails.invalidate({ matchId });
      await utils.match.state.invalidate({ id: matchId });

      setTimeout(() => {
        onDepositSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setStep("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Deposit verification failed."
      );
      toast.error("Deposit Failed", { description: errorMessage });
    }
  };

  return (
    <div className="quickmatch-modal-overlay" onClick={onClose}>
      <div
        className="quickmatch-modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: "480px" }}
      >
        <div className="quickmatch-modal-header">
          <div className="quickmatch-header-left">
            <Coins className="radar-header-icon" size={20} />
            <span
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              NIMIQ ESCROW DEPOSIT
            </span>
          </div>
          <button className="quickmatch-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="quickmatch-modal-body" style={{ textAlign: "center" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "rgba(230, 93, 35, 0.12)",
              border: "2px solid var(--orange)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              color: "var(--orange)",
            }}
          >
            <Coins size={36} />
          </div>

          <h2 style={{ margin: "0 0 6px", fontSize: "24px" }}>
            Deposit {stakeNim} NIM Stake
          </h2>
          <p
            style={{
              color: "rgba(251, 248, 241, 0.7)",
              fontSize: "13px",
              margin: "0 0 20px",
            }}
          >
            Your stake is verified on Nimiq Testnet and held in table escrow. The
            winner claims 90% of the total match pot upon completion.
          </p>

          <div
            style={{
              width: "100%",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(251, 248, 241, 0.12)",
              borderRadius: "8px",
              padding: "14px 18px",
              marginBottom: "20px",
              textAlign: "left",
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: "12px",
            }}
          >
            {/* Wallet Balance Check */}
            {activeWallet && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(251, 248, 241, 0.1)",
                  marginBottom: "8px",
                }}
              >
                <span style={{ color: "rgba(251, 248, 241, 0.6)" }}>
                  Your Testnet Balance:
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      userBalance !== null && userBalance >= stakeNim
                        ? "#2ecc71"
                        : "#f85149",
                  }}
                >
                  {isLoadingBalance
                    ? "Checking..."
                    : userBalance !== null
                      ? `${userBalance.toFixed(2)} NIM`
                      : "0.00 NIM"}
                </span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: "rgba(251, 248, 241, 0.6)" }}>
                Required Stake:
              </span>
              <strong style={{ color: "var(--orange)" }}>{stakeNim} NIM</strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: "rgba(251, 248, 241, 0.6)" }}>
                Luna Units:
              </span>
              <span>{lunaValue.toLocaleString()} Luna</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: "rgba(251, 248, 241, 0.6)" }}>
                Winner Allocation (90%):
              </span>
              <strong style={{ color: "#2ecc71" }}>
                {(stakeNim * 2 * 0.9).toFixed(1)} NIM
              </strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid rgba(251, 248, 241, 0.1)",
                paddingTop: "8px",
              }}
            >
              <span style={{ color: "rgba(251, 248, 241, 0.6)" }}>
                Protection:
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#2ecc71",
                }}
              >
                <ShieldCheck size={14} /> Verified Match Deposit
              </span>
            </div>
          </div>

          {userBalance !== null && userBalance < stakeNim && (
            <div
              style={{
                backgroundColor: "rgba(231, 76, 60, 0.12)",
                border: "1px solid rgba(231, 76, 60, 0.35)",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                fontSize: "12px",
                color: "#ff7b72",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Balance ({userBalance.toFixed(2)} NIM) is below {stakeNim} NIM stake</span>
              <a
                href="https://testnet.nimiq.watch/#faucet"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#EC9918",
                  fontWeight: 700,
                  textDecoration: "underline",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                Get Free NIM <ExternalLink size={11} />
              </a>
            </div>
          )}

          {step === "idle" && (
            <button
              className="primary-action"
              onClick={handleStartDeposit}
              style={{
                width: "100%",
                background: "var(--orange)",
                justifyContent: "center",
                padding: "12px",
                fontSize: "14px",
              }}
            >
              Lock Stake & Enter Match
            </button>
          )}

          {step !== "idle" && step !== "error" && step !== "success" && (
            <div
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(236, 153, 24, 0.3)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "12px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "#EC9918",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "12px",
                }}
              >
                <Loader2 className="radar-header-icon" size={18} />
                <span>
                  {step === "creating" && "Step 1/3: Initializing Intent…"}
                  {step === "paying" && "Step 2/3: Authorizing Transaction…"}
                  {step === "verifying" && "Step 3/3: Verifying on Nimiq PoS…"}
                </span>
              </div>

              {/* Progress Track */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: step !== "creating" ? "#2ecc71" : "rgba(255,255,255,0.7)" }}>
                  <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: step !== "creating" ? "#2ecc71" : "rgba(255,255,255,0.2)", display: "grid", placeItems: "center", fontSize: "10px", color: "#111" }}>✓</span>
                  <span>Match Intent & Anti-Replay Nonce Generated</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: step === "verifying" ? "#2ecc71" : step === "paying" ? "#EC9918" : "rgba(255,255,255,0.4)" }}>
                  <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: step === "verifying" ? "#2ecc71" : step === "paying" ? "#EC9918" : "rgba(255,255,255,0.2)", display: "grid", placeItems: "center", fontSize: "10px", color: "#111" }}>
                    {step === "verifying" ? "✓" : "2"}
                  </span>
                  <span>Broadcast to PoS Validator Microblock</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: step === "verifying" ? "#EC9918" : "rgba(255,255,255,0.4)" }}>
                  <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: step === "verifying" ? "#EC9918" : "rgba(255,255,255,0.2)", display: "grid", placeItems: "center", fontSize: "10px", color: "#111" }}>
                    3
                  </span>
                  <span>Authoritative Server JSON-RPC Verification</span>
                </div>
              </div>

              {txHash && (
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <a
                    href={`https://block-explorer.nimiq-testnet.com/transaction/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#EC9918",
                      fontSize: "11px",
                      fontFamily: "IBM Plex Mono, monospace",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      textDecoration: "underline",
                    }}
                  >
                    View on Nimiq Explorer ({txHash.slice(0, 10)}...{txHash.slice(-6)}) <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          )}

          {step === "success" && (
            <div
              style={{
                backgroundColor: "rgba(46, 204, 113, 0.12)",
                border: "1px solid rgba(46, 204, 113, 0.35)",
                borderRadius: "10px",
                padding: "16px",
                color: "#2ecc71",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={20} /> Stake Verified & Escrow Locked!
              </div>
              {txHash && (
                <a
                  href={`https://block-explorer.nimiq-testnet.com/transaction/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "11px",
                    fontFamily: "IBM Plex Mono, monospace",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    textDecoration: "underline",
                    marginTop: "4px",
                  }}
                >
                  Confirmed TX: {txHash.slice(0, 12)}...{txHash.slice(-6)} <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}

          {step === "error" && (
            <div>
              <div
                style={{
                  color: "#e74c3c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  marginBottom: "12px",
                  fontSize: "13px",
                }}
              >
                <AlertCircle size={16} /> {errorMessage || "Verification error"}
              </div>
              <button
                className="secondary-chip"
                onClick={handleStartDeposit}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Retry Deposit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
