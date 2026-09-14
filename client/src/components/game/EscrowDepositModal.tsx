import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";
import {
  ShieldCheck,
  Coins,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  ExternalLink,
  Wallet,
  Sparkles,
  Check,
  RotateCw,
  Lock,
  ArrowRight,
  Zap,
  Info,
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
  gameTitle?: string;
  yourSeat?: number;
  isAlreadyDeposited?: boolean;
}

export function EscrowDepositModal({
  isOpen,
  onClose,
  matchId,
  stakeNim,
  onDepositSuccess,
  gameTitle = "Ludo Arena — 1v1",
  yourSeat,
  isAlreadyDeposited = false,
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
  const [activeWallet, setActiveWallet] = useState<string | null>(() =>
    getActiveWalletAddress()
  );
  const [isDripping, setIsDripping] = useState(false);
  const requestDrip = trpc.payment.requestTestnetDrip.useMutation();

  const handleRequestDrip = async () => {
    if (!activeWallet) {
      toast.error("Please connect your wallet first.");
      return;
    }
    try {
      setIsDripping(true);
      toast.info("Requesting 50 Testnet NIM drip from hot wallet…");
      const res = await requestDrip.mutateAsync({ address: activeWallet });
      if (res.success) {
        toast.success("50 Testnet NIM Received!", {
          description: `Tx: ${res.txHash.slice(0, 10)}… Checking balance.`,
        });
        setTimeout(() => {
          if (activeWallet) void loadBalance(activeWallet);
        }, 2500);
      } else {
        toast.info("Direct drip standby", {
          description: res.message || "Opening official Nimiq faucet…",
        });
        if (res.fallbackUrl) {
          window.open(res.fallbackUrl, "_blank");
        }
      }
    } catch (err: any) {
      toast.error("Faucet request failed", {
        description:
          err instanceof Error ? err.message : "Try again or visit official faucet.",
      });
      window.open("https://testnet.nimiq.watch/#faucet", "_blank");
    } finally {
      setIsDripping(false);
    }
  };

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

  useEffect(() => {
    if (isOpen) {
      setStep("idle");
      setErrorMessage("");
      setTxHash("");
      getNimiqPayActiveAccount()
        .then((detected) => {
          const current = detected || getActiveWalletAddress();
          setActiveWallet(current);
          if (current) {
            void loadBalance(current);
          } else {
            setUserBalance(null);
            setAccountInfo(null);
          }
        })
        .catch(() => {
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
      toast.error(
        err instanceof Error ? err.message : "Failed to connect wallet."
      );
    }
  };

  const createIntent = trpc.payment.createIntent.useMutation();
  const markPending = trpc.payment.markConfirmationPending.useMutation();
  const submitTx = trpc.payment.submitTransaction.useMutation();
  const verifyPayment = trpc.payment.verify.useMutation();
  const claimPayment = trpc.match.claimPayment.useMutation();

  const modalEscrowQuery = trpc.match.escrowDetails.useQuery(
    { matchId },
    {
      enabled: Boolean(isOpen && matchId),
      staleTime: 3_000,
    }
  );
  const [intentStakeNim, setIntentStakeNim] = useState<number | null>(null);

  if (!isOpen) return null;

  const myStatus = modalEscrowQuery.data?.playerStatuses?.find(
    (p) => typeof yourSeat === "number" && p.seat === yourSeat
  );
  const isAlreadyVerified = isAlreadyDeposited || Boolean(myStatus?.verified);

  const displayStakeNim =
    intentStakeNim && intentStakeNim > 0
      ? intentStakeNim
      : stakeNim > 0
      ? stakeNim
      : modalEscrowQuery.data?.stakeNim && modalEscrowQuery.data.stakeNim > 0
      ? modalEscrowQuery.data.stakeNim
      : 50;

  const totalPot = displayStakeNim * 2;
  const championWins = (totalPot * 0.9).toFixed(1).replace(/\.0$/, "");
  const builderCut = (totalPot * 0.05).toFixed(1).replace(/\.0$/, "");
  const ecosystemCut = (totalPot * 0.03).toFixed(1).replace(/\.0$/, "");
  const publicGoodCut = (totalPot * 0.02).toFixed(1).replace(/\.0$/, "");

  const shortWallet = activeWallet
    ? `${activeWallet.slice(0, 4)} ···· ${activeWallet.slice(-4)}`
    : "NQ07 ···· 32F1";

  const balanceAfter =
    userBalance != null
      ? Math.max(0, userBalance - displayStakeNim).toFixed(2)
      : "1,370.00";

  const handleStartDeposit = async () => {
    if (isAlreadyVerified) {
      toast.info("Stake Already Verified", {
        description: "Your stake is already locked in on-chain escrow for this match.",
      });
      return;
    }
    if (step !== "idle" && step !== "error") {
      return;
    }
    if (accountInfo?.status === "wrong_network") {
      toast.error("Network Mismatch", {
        description: "Please switch Nimiq Pay to Testnet in developer settings.",
      });
      return;
    }
    if (
      accountInfo?.status === "available" &&
      userBalance !== null &&
      displayStakeNim > 0 &&
      userBalance < displayStakeNim
    ) {
      toast.error("Insufficient Balance", {
        description: `You have ${userBalance.toFixed(
          2
        )} NIM but ${displayStakeNim} NIM is required for this match.`,
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
      }, 1200);
    } catch (err) {
      setStep("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Deposit verification failed."
      );
      toast.error("Deposit Failed", { description: errorMessage });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#080e1c]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      
      {/* Elevated Bottom Sheet Surface */}
      <section
        className="w-full max-w-md bg-[#151b29] border-t border-[#2f3544] rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.85)] flex flex-col relative overflow-hidden z-10 pb-safe animate-in slide-in-from-bottom duration-300"
        id="confirmationSheet"
      >
        {/* Top Specular Hairline Accent */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#f3b72c]/40 to-transparent" />

        {/* Drag Handle */}
        <div className="w-full flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#333948]/80" />
        </div>

        {/* Sheet Header */}
        <div className="px-4 pt-2 pb-3 flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl text-[#dde2f6] font-bold tracking-tight">
              Confirm Entry
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldCheck size={15} className="text-[#a5e7ff]" />
              <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono">
                Nimiq Pay Instant Escrow
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#242a39] active:bg-[#333948] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6] transition-colors"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Container */}
        <div className="px-4 space-y-3 pb-4">
          
          {/* Match & Prize Highlight Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1e2638] via-[#151b29] to-[#1e2638] border border-[#f3b72c]/30 rounded-2xl p-4 shadow-lg">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#f3b72c]/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between pb-3 border-b border-[#242a39]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#242a39] flex items-center justify-center border border-[#f3b72c]/30 text-[#f3b72c]">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#dde2f6]">{gameTitle}</h3>
                  <span className="text-[10px] text-[#94a3b8] font-mono">{shortWallet}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#f3b72c]/15 text-[#ffd78d] text-[10px] font-mono font-bold">
                1v1 DUEL
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#94a3b8] font-mono uppercase">Your Stake</span>
                <span className="text-lg font-black text-[#dde2f6] font-mono">{displayStakeNim} NIM</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-[#68f5b8] font-mono uppercase font-bold">Winner Takes</span>
                <span className="text-lg font-black text-[#ffd78d] font-mono">+{championWins} NIM</span>
              </div>
            </div>
          </div>

          {/* Wallet Balance Strip */}
          <div className="bg-[#080e1c]/70 border border-[#242a39] rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs font-mono">
            <div className="flex flex-col">
              <span className="text-[9px] text-[#94a3b8] uppercase">Balance</span>
              <span className="text-[#dde2f6] font-bold">
                {userBalance != null ? `${userBalance.toFixed(2)} NIM` : "0 NIM"}
              </span>
            </div>
            <div className="h-5 w-[1px] bg-[#242a39]" />
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-[#94a3b8] uppercase">After Entry</span>
              <span className="text-[#a5e7ff] font-bold">{balanceAfter} NIM</span>
            </div>
          </div>
                        {/* Insufficient Balance / 1-Click Faucet Callout */}
          {userBalance !== null && userBalance < displayStakeNim && (
            <div className="p-2.5 rounded-xl bg-[#93000a]/20 border border-[#ffb4ab]/30 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#ffb4ab]">
                Need {displayStakeNim} NIM to enter.
              </span>
              <button
                onClick={handleRequestDrip}
                disabled={isDripping}
                className="px-2.5 py-1 rounded-lg bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8] text-[10px] font-bold font-mono flex items-center gap-1 active:scale-95"
              >
                <RotateCw size={12} className={isDripping ? "animate-spin" : ""} />
                <span>{isDripping ? "Dripping…" : "1-Click Drip"}</span>
              </button>
            </div>
          )}

          {/* Primary Call to Action Button & Cancel Option */}
          <div className="space-y-1.5 pt-1">
            {isAlreadyVerified ? (
              <div className="p-3 rounded-xl bg-[#68f5b8]/10 border border-[#68f5b8]/30 flex flex-col items-center gap-2 text-center">
                <div className="flex items-center gap-2 text-[#68f5b8] font-bold text-sm">
                  <CheckCircle2 size={18} />
                  <span>Stake Verified &amp; Locked in Escrow</span>
                </div>
                <p className="text-[11px] text-[#d4c5ad]">
                  Your {displayStakeNim} NIM stake has been securely deposited. Waiting for your opponent or match start.
                </p>
                <button
                  onClick={onClose}
                  type="button"
                  className="w-full h-10 mt-1 bg-[#68f5b8] hover:bg-[#85ffc7] text-[#003824] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <span>Return to Match Table</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleStartDeposit}
                  disabled={step === "creating" || step === "paying" || step === "verifying"}
                  className={`w-full h-13 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(243,183,44,0.35)] ${
                    step === "success"
                      ? "bg-[#68f5b8] text-[#003824]"
                      : step === "error"
                      ? "bg-[#f3b72c] text-[#412d00]"
                      : "bg-[#f3b72c] text-[#412d00] hover:bg-[#ffdea4]"
                  }`}
                >
                  {step === "creating" || step === "paying" || step === "verifying" ? (
                    <>
                      <RotateCw size={18} className="animate-spin" />
                      <span>Signing Micro-Escrow…</span>
                    </>
                  ) : step === "success" ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Match Joined! Entering Arena…</span>
                    </>
                  ) : (
                    <>
                      <Lock size={18} className="font-bold" />
                      <span>Pay {displayStakeNim} NIM &amp; Enter Match</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  onClick={onClose}
                  type="button"
                  className="w-full h-9 text-[#d4c5ad] hover:text-[#dde2f6] text-xs font-semibold active:scale-95 transition-all flex items-center justify-center"
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          {/* Security Badge Micro-Footer */}
          <div className="flex items-center justify-center gap-1.5 text-[#d4c5ad]/70 text-center pb-1">
            <Lock size={12} className="text-[#68f5b8]" />
            <span className="text-[10px] font-mono tracking-wide">
              Zero gas fees · Non-custodial escrow · Instant payout
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
