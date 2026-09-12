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
            className="w-9 h-9 rounded-full bg-[#242a39] active:bg-[#333948] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6] transition-colors"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Container */}
        <div className="px-4 space-y-3 pb-4">
          
          {/* Mode & Match Summary Pill Card */}
          <div className="bg-[#191f2e] border border-[#242a39] rounded-xl p-3 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-[#2f3544] overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5">
                <img
                  className="w-full h-full object-cover"
                  alt="3D Glowing Game Dice"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYhvuCq_sHkLkZ--n3N7hzQPMUC6P5nNLwtHVwcY48NvoKopVjALQxK9lVOvapxfolCMaB3WYeFQNazjrlWEZr6G3gojXQTfT30DnNZxlkJQqCJY5yOXS20SCXezsCNaXeApgnqDPDd17wtSk-66d-9ugCR_z7JRCqfVIcY05SqZ8JWm496OsWd9a_RrVbj4Bp3jO1yJp0IJuLWZalf-Obm5WX7E0yTVnICGWsrUBXkWf4n_gQWFruwQ"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-[#dde2f6] font-semibold truncate">
                  {gameTitle}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#68f5b8] shadow-[0_0_6px_#68f5b8]" />
                  <span className="text-[10px] text-[#d4c5ad] font-mono">
                    {shortWallet}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end flex-shrink-0 pl-2">
              <span className="text-[10px] text-[#d4c5ad] uppercase font-mono">
                Your Stake
              </span>
              <span className="text-sm text-[#ffd78d] font-bold font-mono">
                {stakeNim} NIM
              </span>
            </div>
          </div>

          {/* Pot & Payout Highlight Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#242a39] via-[#191f2e] to-[#242a39] border border-[#2f3544] rounded-xl p-3.5 shadow-lg">
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#f3b72c]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-end justify-between relative z-10">
              <div>
                <div className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono">
                  Total Match Pot
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl text-[#dde2f6] font-black tracking-tight font-mono">
                    {totalPot}
                  </span>
                  <span className="text-xs text-[#ffd78d] font-bold font-mono">
                    NIM
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="h-5 px-2 rounded-full bg-[#f3b72c]/20 text-[#ffdea4] text-[11px] font-bold tracking-tight inline-flex items-center justify-center mb-1 font-mono">
                  1.8x Payout
                </span>
                <div className="text-[10px] text-[#d4c5ad] font-mono">
                  Champion Wins
                </div>
                <div className="text-lg text-[#f3b72c] font-black font-mono">
                  +{championWins} <span className="text-xs font-semibold">NIM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Prize Distribution Section */}
          <div className="bg-[#191f2e] border border-[#242a39] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono">
                Pot Breakdown
              </span>
              <span className="text-[11px] text-[#a5e7ff] flex items-center gap-1 font-mono font-medium">
                <Zap size={13} className="text-[#a5e7ff]" /> Instant Escrow
              </span>
            </div>

            {/* Segmented Visual Bar */}
            <div className="w-full h-2 rounded-full bg-[#2f3544] overflow-hidden flex">
              <div
                className="h-full bg-[#f3b72c]"
                style={{ width: "90%" }}
                title="Winner 90%"
              />
              <div
                className="h-full bg-[#00d2ff]"
                style={{ width: "5%" }}
                title="Arena Builder 5%"
              />
              <div
                className="h-full bg-[#68f5b8]"
                style={{ width: "3%" }}
                title="Ecosystem 3%"
              />
              <div
                className="h-full bg-[#333948]"
                style={{ width: "2%" }}
                title="Public Good 2%"
              />
            </div>

            {/* Structured Rows */}
            <div className="space-y-1 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#f3b72c]" />
                  <span className="text-[#dde2f6] font-medium">Winner Takes</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="px-1.5 py-0.5 rounded bg-[#f3b72c]/15 text-[#ffdea4] font-bold">
                    90%
                  </span>
                  <span className="text-[#ffd78d] font-semibold">
                    {championWins} NIM
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00d2ff]" />
                  <span className="text-[#d4c5ad]">Arena Builder</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[#d4c5ad]">5%</span>
                  <span className="text-[#dde2f6]">{builderCut} NIM</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#68f5b8]" />
                  <span className="text-[#d4c5ad]">Nimiq Ecosystem Pool</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[#d4c5ad]">3%</span>
                  <span className="text-[#dde2f6]">{ecosystemCut} NIM</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#333948]" />
                  <span className="text-[#d4c5ad]">Community Public Good</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[#d4c5ad]">2%</span>
                  <span className="text-[#dde2f6]">{publicGoodCut} NIM</span>
                </div>
              </div>
            </div>

            <div className="pt-1 text-[10px] leading-tight text-[#d4c5ad]/80 flex items-start gap-1.5">
              <Info size={13} className="text-[#a5e7ff] mt-0.5 flex-shrink-0" />
              <span>
                Settled automatically via Nimiq micro-contracts upon match checkmate or opponent forfeit.
              </span>
            </div>
          </div>

          {/* Wallet Balance Ledger Verification */}
          <div className="bg-[#080e1c]/70 border border-[#242a39] rounded-xl px-3 py-2.5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#d4c5ad] font-mono">
                Available Balance
              </span>
              <span className="text-xs text-[#dde2f6] font-semibold font-mono">
                {balanceNim != null ? `${formatNim(balanceNim)} NIM` : "1,420.00 NIM"}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-[#333948]" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#d4c5ad] font-mono">
                Balance After Entry
              </span>
              <span className="text-xs text-[#a5e7ff] font-semibold font-mono">
                {balanceAfter} NIM
              </span>
            </div>
          </div>

          {/* Insufficient Balance / 1-Click Faucet Callout */}
          {balanceNim !== null && balanceNim !== undefined && balanceNim < stakeNim && (
            <div className="p-2.5 rounded-xl bg-[#93000a]/20 border border-[#ffb4ab]/30 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#ffb4ab]">
                Low balance: Need {stakeNim} NIM to enter.
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
            <button
              onClick={onConfirm}
              disabled={isConfirming}
              className="w-full h-13 py-3 rounded-xl font-bold text-sm bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(243,183,44,0.35)]"
            >
              {isConfirming ? (
                <>
                  <RotateCw size={18} className="animate-spin" />
                  <span>Signing Micro-Escrow…</span>
                </>
              ) : (
                <>
                  <Lock size={18} className="font-bold" />
                  <span>Pay {stakeNim} NIM &amp; Enter Match</span>
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
