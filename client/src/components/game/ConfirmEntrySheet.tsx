import React, { useState } from "react";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";
import {
  ShieldCheck,
  X,
  Lock,
  ArrowRight,
  Zap,
  Info,
  RotateCw,
  CheckCircle2,
  Dices,
} from "lucide-react";
import { formatNim } from "@shared/game/pot-distribution";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ConfirmEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle?: string;
  stakeNim: number;
  onConfirm: () => Promise<void> | void;
  isConfirming?: boolean;
  walletAddress?: string | null;
  balanceNim?: number | null;
  onRefreshBalance?: () => void;
}

export function ConfirmEntrySheet({
  isOpen,
  onClose,
  gameTitle = "Ludo Arena — 1v1",
  stakeNim = 50,
  onConfirm,
  isConfirming = false,
  walletAddress,
  balanceNim,
  onRefreshBalance,
}: ConfirmEntrySheetProps) {
  useModalBackHandler(isOpen, onClose);
  const [isDripping, setIsDripping] = useState(false);
  const requestDrip = trpc.payment.requestTestnetDrip.useMutation();

  if (!isOpen) return null;

  const totalPot = stakeNim * 2;
  const championWins = (totalPot * 0.9).toFixed(1).replace(/\.0$/, "");
  const builderCut = (totalPot * 0.05).toFixed(1).replace(/\.0$/, "");
  const ecosystemCut = (totalPot * 0.03).toFixed(1).replace(/\.0$/, "");
  const publicGoodCut = (totalPot * 0.02).toFixed(1).replace(/\.0$/, "");

  const shortWallet = walletAddress
    ? `${walletAddress.slice(0, 4)} ···· ${walletAddress.slice(-4)}`
    : "NQ07 ···· 32F1";

  const balanceAfter =
    balanceNim != null
      ? Math.max(0, balanceNim - stakeNim).toFixed(2)
      : "1,370.00";

  const handleRequestDrip = async () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }
    try {
      setIsDripping(true);
      toast.info("Requesting 50 Testnet NIM drip from hot wallet…");
      const res = await requestDrip.mutateAsync({ address: walletAddress });
      if (res.success) {
        toast.success("50 Testnet NIM Received!", {
          description: `Tx: ${res.txHash.slice(0, 10)}… Checking balance.`,
        });
        setTimeout(() => {
          onRefreshBalance?.();
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
            aria-label="Close"
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
                  <Dices size={20} />
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
                <span className="text-[10px] text-[#94a3b8] font-mono uppercase">Your Entry</span>
                <span className="text-lg font-black text-[#dde2f6] font-mono">{stakeNim} NIM</span>
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
                {balanceNim != null ? `${formatNim(balanceNim)} NIM` : "0 NIM"}
              </span>
            </div>
            <div className="h-5 w-[1px] bg-[#242a39]" />
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-[#94a3b8] uppercase">After Entry</span>
              <span className="text-[#a5e7ff] font-bold">{balanceAfter} NIM</span>
            </div>
          </div>

          {/* Insufficient Balance / 1-Click Faucet Callout */}
          {balanceNim !== null && balanceNim !== undefined && balanceNim < stakeNim && (
            <div className="p-2.5 rounded-xl bg-[#93000a]/20 border border-[#ffb4ab]/30 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#ffb4ab]">
                Need {stakeNim} NIM to enter.
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
          <div className="space-y-2 pt-1">
            <button
              onClick={onConfirm}
              disabled={isConfirming}
              className="w-full h-12 rounded-xl font-bold text-sm bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(243,183,44,0.35)] cursor-pointer"
            >
              {isConfirming ? (
                <>
                  <RotateCw size={18} className="animate-spin" />
                  <span>Entering Arena…</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Lock {stakeNim} NIM &amp; Start Match</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              onClick={onClose}
              type="button"
              className="w-full h-8 text-[#94a3b8] hover:text-[#dde2f6] text-xs font-semibold active:scale-95 transition-all flex items-center justify-center"
            >
              Cancel
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
