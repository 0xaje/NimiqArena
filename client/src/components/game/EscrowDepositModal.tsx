import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ShieldCheck,
  Coins,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Copy,
  ExternalLink,
} from "lucide-react";
import { createPaymentNonce } from "@/lib/payment-state";
import { getNimiqProvider } from "@/lib/nimiq-miniapp";

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
  const utils = trpc.useUtils();
  const [step, setStep] = useState<
    "idle" | "creating" | "paying" | "verifying" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  const createIntent = trpc.payment.createIntent.useMutation();
  const markPending = trpc.payment.markConfirmationPending.useMutation();
  const submitTx = trpc.payment.submitTransaction.useMutation();
  const verifyPayment = trpc.payment.verify.useMutation();
  const claimPayment = trpc.match.claimPayment.useMutation();

  if (!isOpen) return null;

  const lunaValue = Math.floor(stakeNim * 100_000);

  const handleStartDeposit = async () => {
    try {
      setStep("creating");
      setErrorMessage("");

      // 1. Create payment intent
      const nonce = createPaymentNonce();
      const intentRes = await createIntent.mutateAsync({
        clientNonce: nonce,
      });
      const intent = intentRes;

      setStep("paying");
      await markPending.mutateAsync({ id: intent.id });

      // 2. Request real transaction via Nimiq Provider
      const provider = getNimiqProvider();
      if (!provider) {
        throw new Error(
          "Nimiq Pay wallet is not connected. Open this Mini App inside Nimiq Pay to approve and broadcast an authoritative blockchain stake transaction."
        );
      }

      const txResult = await (provider as any).sendBasicTransaction({
        recipient: intent.recipient,
        value: intent.valueLuna,
      });

      if (!txResult || typeof txResult !== "string") {
        throw new Error("Transaction was rejected or not completed in Nimiq Pay.");
      }

      const realTxHash = txResult;
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
            Your stake is held securely in the Nimiq smart escrow contract. The
            winner claims the total pot upon match completion.
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
                Potential Win Pot:
              </span>
              <strong style={{ color: "#2ecc71" }}>
                {(stakeNim * 2).toFixed(1)} NIM
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
                Security:
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#2ecc71",
                }}
              >
                <ShieldCheck size={14} /> Trustless Escrow
              </span>
            </div>
          </div>

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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "12px",
                color: "var(--orange)",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "13px",
              }}
            >
              <Loader2 className="radar-header-icon" size={18} />
              <span>
                {step === "creating" && "Initializing Payment Intent…"}
                {step === "paying" && "Submitting Nimiq Transaction…"}
                {step === "verifying" && "Verifying On-Chain Confirmations…"}
              </span>
            </div>
          )}

          {step === "success" && (
            <div
              style={{
                color: "#2ecc71",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={20} /> Stake Verified & Escrow Locked!
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
