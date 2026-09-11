import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";
import {
  ShieldCheck,
  Coins,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  X,
  Copy,
  ExternalLink,
  Wallet,
  Sparkles,
  Check,
  RotateCw,
} from "lucide-react";
import { createPaymentNonce } from "@/lib/payment-state";
import {
  sendNimiqPayment,
  getActiveWalletAddress,
  getNimiqPayActiveAccount,
  fetchNimiqAccountInfo,
  type NimiqAccountInfo,
  formatNimiqAddress,
  connectViaNimiqHub,
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
  const [accountInfo, setAccountInfo] = useState<NimiqAccountInfo | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [activeWallet, setActiveWallet] = useState<string | null>(() => getActiveWalletAddress());

  const loadBalance = async (addr: string) => {
    setIsLoadingBalance(true);
    try {
      const info = await fetchNimiqAccountInfo(addr, "testnet");
      setAccountInfo(info);
      setUserBalance(info.balanceNim);
    } catch {
      setAccountInfo(null);
      setUserBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      setStep("idle");
      setErrorMessage("");
      setTxHash("");
      // Prioritize active Nimiq Pay account when running inside mobile container
      getNimiqPayActiveAccount().then(detected => {
        const current = detected || getActiveWalletAddress();
        setActiveWallet(current);
        if (current) {
          void loadBalance(current);
        } else {
          setUserBalance(null);
          setAccountInfo(null);
        }
      }).catch(() => {
        const current = getActiveWalletAddress();
        setActiveWallet(current);
        if (current) void loadBalance(current);
      });
    }
  }, [isOpen]);

  const handleConnectWallet = async () => {
    try {
      const res = await connectViaNimiqHub();
      setActiveWallet(res.address);
      void loadBalance(res.address);
      toast.success("Wallet connected!", { description: res.address });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect wallet.");
    }
  };

  const handleSyncNimiqPay = async () => {
    setIsLoadingBalance(true);
    try {
      const detected = await getNimiqPayActiveAccount(4000);
      if (detected) {
        setActiveWallet(detected);
        await loadBalance(detected);
        toast.success("Nimiq Pay wallet synced!", { description: detected });
      } else {
        toast.error("Could not detect Nimiq Pay wallet. Ensure Nimiq Pay is open.");
      }
    } catch {
      toast.error("Failed to sync Nimiq Pay account.");
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const createIntent = trpc.payment.createIntent.useMutation();
  const markPending = trpc.payment.markConfirmationPending.useMutation();
  const submitTx = trpc.payment.submitTransaction.useMutation();
  const verifyPayment = trpc.payment.verify.useMutation();
  const claimPayment = trpc.match.claimPayment.useMutation();

  // Internal fallback query if stakeNim was 0 or unhydrated on initial mount
  const modalEscrowQuery = trpc.match.escrowDetails.useQuery(
    { matchId },
    {
      enabled: Boolean(isOpen && matchId && (!stakeNim || stakeNim <= 0)),
      staleTime: 5_000,
    }
  );
  const [intentStakeNim, setIntentStakeNim] = useState<number | null>(null);

  if (!isOpen) return null;

  // Display only. Resolved dynamically from intent, parent prop, or server escrow query
  const displayStakeNim =
    intentStakeNim && intentStakeNim > 0
      ? intentStakeNim
      : stakeNim > 0
      ? stakeNim
      : modalEscrowQuery.data?.stakeNim && modalEscrowQuery.data.stakeNim > 0
      ? modalEscrowQuery.data.stakeNim
      : 0;

  const lunaValue = Math.floor(displayStakeNim * 100_000);

  const handleStartDeposit = async () => {
    if (accountInfo?.status === "wrong_network") {
      toast.error("Network Mismatch", {
        description: "Please switch Nimiq Pay to Testnet in developer settings.",
      });
      return;
    }
    if (accountInfo?.status === "available" && userBalance !== null && displayStakeNim > 0 && userBalance < displayStakeNim) {
      toast.error("Insufficient Balance", {
        description: `You have ${userBalance.toFixed(2)} NIM but ${displayStakeNim} NIM is required for this match.`,
      });
      return;
    }
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
      if (intent.valueLuna > 0) {
        setIntentStakeNim(intent.valueLuna / 100_000);
      }

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
            {/* Connected Account & Sync Action */}
            {activeWallet ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: "1px solid rgba(251, 248, 241, 0.1)",
                    marginBottom: "6px",
                  }}
                >
                  <span style={{ color: "rgba(251, 248, 241, 0.6)" }}>
                    Connected Account:
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#fbbf24", fontWeight: 600 }}>
                      {activeWallet.slice(0, 4)}…{activeWallet.slice(-4)}
                    </span>
                    <button
                      type="button"
                      onClick={handleSyncNimiqPay}
                      disabled={isLoadingBalance}
                      title="Re-sync active account from Nimiq Pay"
                      style={{
                        background: "rgba(236, 153, 24, 0.15)",
                        border: "1px solid rgba(236, 153, 24, 0.35)",
                        color: "#EC9918",
                        borderRadius: "4px",
                        padding: "2px 7px",
                        fontSize: "10px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <RotateCw size={10} className={isLoadingBalance ? "spin" : ""} /> Sync Pay
                    </button>
                  </span>
                </div>

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
                  {isLoadingBalance ? (
                    <span style={{ color: "rgba(251, 248, 241, 0.5)", fontSize: "12px" }}>
                      <Loader2 size={12} className="animate-spin" style={{ display: "inline", marginRight: "4px" }} />
                      Checking…
                    </span>
                  ) : accountInfo?.status === "unavailable" ? (
                    <span style={{ color: "rgba(251, 248, 241, 0.5)", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      Offline
                      <button
                        type="button"
                        onClick={() => activeWallet && void loadBalance(activeWallet)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#EC9918",
                          cursor: "pointer",
                          textDecoration: "underline",
                          fontSize: "11px",
                          padding: 0,
                        }}
                      >
                        <RotateCw size={11} /> Retry
                      </button>
                    </span>
                  ) : accountInfo?.status === "wrong_network" ? (
                    <span style={{ color: "#f85149", fontWeight: 700, fontSize: "11px" }}>
                      Network Mismatch
                    </span>
                  ) : (
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          userBalance !== null && userBalance >= displayStakeNim
                            ? "#2ecc71"
                            : "#f85149",
                      }}
                    >
                      {userBalance !== null ? `${userBalance.toFixed(2)} NIM` : "0.00 NIM"}
                      <span
                        style={{
                          fontSize: "10px",
                          marginLeft: "4px",
                          opacity: 0.85,
                          color: "#EC9918",
                          fontWeight: 400,
                        }}
                      >
                        [Testnet]
                      </span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSyncNimiqPay}
                    disabled={isLoadingBalance}
                    title="Sync with active Nimiq Pay / Hub wallet"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#EC9918",
                      cursor: "pointer",
                      padding: "2px",
                      opacity: 0.8,
                    }}
                  >
                    <RotateCw size={12} />
                  </button>
                </div>
              </>
            ) : (
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
                  Wallet:
                </span>
                <div style={{ display: "inline-flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={handleSyncNimiqPay}
                    style={{
                      background: "rgba(236, 153, 24, 0.2)",
                      border: "1px solid rgba(236, 153, 24, 0.5)",
                      color: "#EC9918",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      cursor: "pointer",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <RotateCw size={12} className={isLoadingBalance ? "spin" : ""} /> Sync Nimiq Pay
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "rgba(251, 248, 241, 0.8)",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      cursor: "pointer",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Wallet size={12} /> Hub
                  </button>
                </div>
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
              <strong style={{ color: "var(--orange)" }}>{displayStakeNim} NIM</strong>
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
                {(displayStakeNim * 2 * 0.9).toFixed(1)} NIM
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

          {/* Network Mismatch Callout */}
          {accountInfo?.status === "wrong_network" && (
            <div
              style={{
                backgroundColor: "rgba(231, 76, 60, 0.15)",
                border: "1px solid rgba(231, 76, 60, 0.4)",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                fontSize: "12px",
                color: "#ff7b72",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textAlign: "left",
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>NETWORK MISMATCH: Switch Nimiq Pay to Testnet in developer settings to fund with Testnet NIM.</span>
            </div>
          )}

          {/* RPC Unavailable Alert (NEVER pretend it's 0 NIM) */}
          {accountInfo?.status === "unavailable" && !isLoadingBalance && (
            <div
              style={{
                backgroundColor: "rgba(236, 153, 24, 0.12)",
                border: "1px solid rgba(236, 153, 24, 0.35)",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                fontSize: "12px",
                color: "#EC9918",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                textAlign: "left",
              }}
            >
              <span>TestAlbatross balance query is busy or pending.</span>
              <button
                type="button"
                onClick={() => activeWallet && loadBalance(activeWallet)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#EC9918",
                  fontWeight: 700,
                  textDecoration: "underline",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                Retry <RotateCw size={11} />
              </button>
            </div>
          )}

          {/* Real Insufficient Balance Alert (Only shown when balance is genuinely known and insufficient) */}
          {accountInfo?.status === "available" && userBalance !== null && displayStakeNim > 0 && userBalance < displayStakeNim && (
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
              <span>Balance ({userBalance.toFixed(2)} NIM) is below {displayStakeNim} NIM stake</span>
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

          {/* Real Zero Balance Alert */}
          {accountInfo?.status === "zero" && (
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
              <span>Account has 0 NIM on TestAlbatross</span>
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
