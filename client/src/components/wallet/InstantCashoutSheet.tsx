import React, { useState, useEffect } from "react";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";
import {
  Zap,
  X,
  Lock,
  LockKeyholeOpen,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Gauge,
  Sparkles,
  Wallet,
  Clock,
} from "lucide-react";
import { formatNim } from "@shared/game/pot-distribution";
import { toast } from "sonner";
import { CashoutReceiptModal, type CashoutReceiptData } from "./CashoutReceiptModal";
import { useNimiqPrice } from "@/lib/nimiq-price";

interface InstantCashoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  vaultBalanceNim?: number;
  lockedInDuelsNim?: number;
  connectedAddress?: string | null;
  onSuccess?: (amount: number, txHash?: string) => void;
}

export function InstantCashoutSheet({
  isOpen,
  onClose,
  vaultBalanceNim = 0,
  lockedInDuelsNim = 0,
  connectedAddress = "",
  onSuccess,
}: InstantCashoutSheetProps) {
  useModalBackHandler(isOpen, onClose);
  const { nimToUsd, formatUsd, priceUsd } = useNimiqPrice();

  const availableBalance = Math.max(0, vaultBalanceNim);
  const minCashout = 10;
  const maxCashout = Math.max(minCashout, availableBalance);

  const [amount, setAmount] = useState<number>(Math.min(500, maxCashout));
  const [selectedRatio, setSelectedRatio] = useState<number>(0.5);
  const [copied, setCopied] = useState(false);
  const [isSwitchingTarget, setIsSwitchingTarget] = useState(false);
  const [customTarget, setCustomTarget] = useState("");
  const [targetAddress, setTargetAddress] = useState(connectedAddress || "NQ07 39F2 88KA 19BL 4920 32F1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<CashoutReceiptData | null>(null);

  useEffect(() => {
    if (connectedAddress) {
      setTargetAddress(connectedAddress);
    }
  }, [connectedAddress]);

  useEffect(() => {
    if (isOpen) {
      setIsDispatched(false);
      setIsSubmitting(false);
      const defaultAmount = Math.min(500, maxCashout);
      setAmount(defaultAmount);
      setSelectedRatio(maxCashout > 0 ? defaultAmount / maxCashout : 0.5);
    }
  }, [isOpen, maxCashout]);

  if (showReceipt && receiptData) {
    return (
      <CashoutReceiptModal
        isOpen={true}
        onClose={() => {
          setShowReceipt(false);
          onClose();
        }}
        data={receiptData}
      />
    );
  }

  if (!isOpen) return null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setAmount(val);
    const r = maxCashout > 0 ? val / maxCashout : 0;
    setSelectedRatio(r);
  };

  const handleRatioClick = (ratio: number) => {
    setSelectedRatio(ratio);
    const calculated = Math.round((maxCashout * ratio) / 10) * 10;
    setAmount(Math.min(maxCashout, Math.max(minCashout, calculated)));
  };

  const handleMaxClick = () => {
    setAmount(maxCashout);
    setSelectedRatio(1.0);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(targetAddress.replace(/\s+/g, ""));
    setCopied(true);
    toast.success("Settlement address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmTargetSwitch = () => {
    if (customTarget.trim().length >= 10) {
      setTargetAddress(customTarget.trim());
      setIsSwitchingTarget(false);
      toast.success("Destination target updated!");
    } else {
      toast.error("Please enter a valid Nimiq address (e.g. NQ...)");
    }
  };

  const handleConfirmCashout = () => {
    setIsSubmitting(true);
    // Simulate real PoS instant finality broadcast
    setTimeout(() => {
      setIsSubmitting(false);
      setIsDispatched(true);
      const dummyTx = `0x${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
      toast.success(`🎉 ${formatNim(amount)} NIM settled directly to your wallet!`);
      onSuccess?.(amount, dummyTx);

      const rData: CashoutReceiptData = {
        amountNim: amount,
        txHash: dummyTx,
        blockHeight: 3982416,
        timestamp: "Just now · On-Chain Finalized",
        senderAddress: "NQ42 8K9L 27MN 91BZ",
        recipientAddress: targetAddress,
        recipientName: "Valkyrie Vault (Nimiq Pay)",
        remainingVaultNim: Math.max(0, availableBalance - amount),
        inPlayNim: lockedInDuelsNim,
      };
      setReceiptData(rData);

      setTimeout(() => {
        setShowReceipt(true);
      }, 1000);
    }, 1200);
  };

  const sliderPercent = maxCashout > 0 ? Math.min(100, Math.max(0, (amount / maxCashout) * 100)) : 0;
  const usdValue = formatUsd(nimToUsd(amount));
  const vaultUsdValue = formatUsd(nimToUsd(availableBalance));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      {/* Dimmed & Blurred Background Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#080e1c]/80 backdrop-blur-md transition-opacity duration-300 z-40"
      />

      {/* Bottom Sheet Modal Container (Mobile Mini-App Thumb Reach) */}
      <div className="relative w-full max-w-md bg-[#151b29] border-t border-[#242a39] rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.85)] max-h-[85vh] overflow-y-auto pb-safe z-50 flex flex-col">
        {/* Drag Handle & Header */}
        <div className="sticky top-0 bg-[#151b29]/95 backdrop-blur-md z-20 pt-3 pb-3 px-4 flex flex-col items-center border-b border-[#242a39]/40">
          <div className="w-12 h-1.5 rounded-full bg-[#333948] mb-3" />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#f3b72c]/15 flex items-center justify-center">
                <Zap className="text-[#f3b72c]" size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-[#dde2f6]">Instant Cashout</h2>
                  <span className="w-2 h-2 rounded-full bg-[#68f5b8] animate-pulse" />
                </div>
                <p className="text-[10px] text-[#d4c5ad] font-mono">
                  Non-Custodial Nimiq Pay Settlement
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#242a39] hover:bg-[#2f3544] flex items-center justify-center active:scale-90 transition-transform text-[#d4c5ad]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sheet Content Body */}
        <div className="px-4 flex flex-col gap-4 pt-3 pb-6">
          {/* 1. Available Vault Balance Banner */}
          <div className="bg-[#191f2e] border border-[#242a39] p-4 rounded-2xl flex flex-col gap-1.5 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono">
                  Settlement Vault Balance
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-bold font-mono text-[#dde2f6] tracking-tight">
                    {formatNim(availableBalance)}
                  </span>
                  <span className="text-xs font-bold text-[#ffd78d] font-mono">NIM</span>
                  <span className="text-[11px] text-[#d4c5ad] font-mono ml-1">
                    ≈ {vaultUsdValue}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleMaxClick}
                className="h-7 px-3 rounded-full bg-[#f3b72c] text-[#412d00] text-xs font-black shadow-[0_2px_10px_rgba(243,183,44,0.3)] active:scale-95 transition-transform"
              >
                MAX
              </button>
            </div>

            {/* In-Flight Status Bar */}
            <div className="flex items-center justify-between text-[11px] text-[#9c8f7a] font-mono pt-2 border-t border-[#242a39]/60">
              <span className="flex items-center gap-1.5">
                <Lock size={12} className="text-[#00d2ff]" />
                In Active Duels:
              </span>
              <span className="text-[#dde2f6] font-bold font-mono">
                {formatNim(lockedInDuelsNim)} NIM
              </span>
            </div>
          </div>

          {/* 2. Amount Input & Quick Percentage Selector */}
          <div className="bg-[#191f2e] border border-[#242a39] p-4 rounded-2xl flex flex-col items-center gap-2">
            <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono">
              Cashout Amount
            </span>

            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black font-mono text-[#ffd78d] tracking-tight">
                {formatNim(amount)}
              </span>
              <span className="text-sm font-bold text-[#ffd78d] font-mono">NIM</span>
            </div>

            <div className="px-2.5 py-0.5 rounded-md bg-[#080e1c] text-[#68f5b8] text-xs font-mono font-bold">
              ≈ {usdValue}
            </div>

            {/* Tactile Slider */}
            <div className="w-full mt-3 px-1 flex flex-col gap-1.5">
              <div className="relative w-full h-3 bg-[#080e1c] rounded-full overflow-hidden flex items-center border border-[#242a39]">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#00d2ff] to-[#f3b72c] rounded-full transition-all"
                  style={{ width: `${sliderPercent}%` }}
                />
                <input
                  type="range"
                  min={minCashout}
                  max={maxCashout}
                  step={10}
                  value={amount}
                  onChange={handleSliderChange}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </div>

              <div className="flex justify-between text-[10px] text-[#d4c5ad] font-mono">
                <span>{minCashout} NIM</span>
                <span>{formatNim(Math.round(maxCashout / 2))} NIM</span>
                <span>{formatNim(maxCashout)} NIM</span>
              </div>
            </div>

            {/* Ratio Quick Selector Pills */}
            <div className="grid grid-cols-4 gap-1.5 w-full mt-3">
              {[
                { label: "25%", ratio: 0.25 },
                { label: "50%", ratio: 0.5 },
                { label: "75%", ratio: 0.75 },
                { label: "100%", ratio: 1.0 },
              ].map((pill) => {
                const isMatching = Math.abs(selectedRatio - pill.ratio) < 0.08;
                return (
                  <button
                    key={pill.label}
                    type="button"
                    onClick={() => handleRatioClick(pill.ratio)}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all active:scale-95 ${
                      isMatching
                        ? "bg-[#f3b72c] text-[#412d00] shadow-md scale-[1.02]"
                        : "bg-[#191f2e] text-[#dde2f6] hover:bg-[#2f3544] border border-[#2f3544]"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Destination Address / Recipient Card */}
          <div className="bg-[#191f2e] border border-[#242a39] p-4 rounded-2xl flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono">
                Settlement Target
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00d2ff]/15 text-[#00d2ff]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />
                <span className="text-[10px] font-mono font-bold">PoS Instant Finality</span>
              </div>
            </div>

            {!isSwitchingTarget ? (
              <div className="p-3 rounded-xl bg-[#242a39] border border-[#2f3544] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#191f2e] flex items-center justify-center shrink-0 text-[#00d2ff]">
                    <Wallet size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-[#dde2f6] truncate">
                        Connected Nimiq Pay
                      </span>
                      <ShieldCheck size={14} className="text-[#68f5b8]" />
                    </div>
                    <span className="text-[10px] text-[#d4c5ad] font-mono truncate">
                      {targetAddress}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="p-2 rounded-lg bg-[#191f2e] hover:bg-[#2f3544] text-[#d4c5ad] active:scale-90 transition-transform"
                >
                  {copied ? <Check size={14} className="text-[#68f5b8]" /> : <Copy size={14} />}
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#242a39] border border-[#2f3544] flex flex-col gap-2">
                <span className="text-[10px] text-[#ffd78d] font-mono font-bold">
                  Enter External Cold / Hardware Vault Address
                </span>
                <input
                  type="text"
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  placeholder="NQ..."
                  className="w-full h-9 px-2.5 rounded-lg bg-[#080e1c] border border-[#242a39] text-xs font-mono text-[#dde2f6] placeholder:text-[#d4c5ad]/50 focus:outline-none focus:border-[#00d2ff]"
                />
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleConfirmTargetSwitch}
                    className="flex-1 py-1.5 rounded-lg bg-[#f3b72c] text-[#412d00] font-bold text-xs"
                  >
                    Save Target
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSwitchingTarget(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#191f2e] text-[#d4c5ad] text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!isSwitchingTarget && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-[#d4c5ad]">Send to external cold vault?</span>
                <button
                  type="button"
                  onClick={() => setIsSwitchingTarget(true)}
                  className="text-[10px] text-[#00d2ff] hover:underline flex items-center gap-0.5 font-bold"
                >
                  Switch Target <ArrowRight size={11} />
                </button>
              </div>
            )}
          </div>

          {/* 4. Settlement Economics Breakdown */}
          <div className="bg-[#080e1c] border border-[#242a39] p-4 rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#d4c5ad]">Gross Amount</span>
              <span className="font-bold font-mono text-[#dde2f6]">{formatNim(amount)} NIM</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[#d4c5ad]">Arena Protocol Fee</span>
                <span className="px-1.5 py-0.5 rounded bg-[#68f5b8]/15 text-[#68f5b8] text-[9px] font-mono font-bold">
                  0% PROMO
                </span>
              </div>
              <span className="font-mono text-[#68f5b8]">0.00 NIM</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[#d4c5ad]">Network Gas Fee</span>
                <span className="px-1.5 py-0.5 rounded bg-[#00d2ff]/15 text-[#00d2ff] text-[9px] font-mono font-bold">
                  RELAYED
                </span>
              </div>
              <span className="font-mono text-[#00d2ff]">0.00 NIM</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-[#d4c5ad]">Settlement Time</span>
              <span className="font-bold font-mono text-[#dde2f6] flex items-center gap-1">
                <Clock size={12} className="text-[#68f5b8]" /> &lt; 1 Second
              </span>
            </div>

            <div className="h-[1px] bg-[#242a39] my-0.5" />

            <div className="flex justify-between items-center pt-0.5">
              <span className="text-xs font-bold text-[#dde2f6]">Net Payout to Wallet</span>
              <div className="text-right">
                <span className="text-sm font-black font-mono text-[#ffd78d]">
                  {formatNim(amount)} NIM
                </span>
                <p className="text-[10px] text-[#68f5b8] font-mono font-semibold">
                  (≈ ${usdValue} USD)
                </p>
              </div>
            </div>
          </div>

          {/* 5. Provably Secure Trust Badge */}
          <div className="flex items-start gap-2.5 px-1">
            <ShieldCheck size={16} className="text-[#68f5b8] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#d4c5ad] leading-snug">
              Non-custodial dispatch. Arena smart contract directly unlocks your tokens to your private key with zero intermediary delay.
            </p>
          </div>

          {/* 6. Confirmation CTA Interaction */}
          <div className="flex flex-col gap-1.5 mt-1">
            <button
              type="button"
              onClick={handleConfirmCashout}
              disabled={isSubmitting || isDispatched || amount <= 0}
              className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all shadow-lg active:scale-[0.98] ${
                isDispatched
                  ? "bg-[#68f5b8] text-[#003824]"
                  : isSubmitting
                  ? "bg-[#f3b72c]/80 text-[#412d00] cursor-wait"
                  : "bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] shadow-[0_4px_24px_rgba(243,183,44,0.35)]"
              }`}
            >
              {isDispatched ? (
                <>
                  <Sparkles size={20} />
                  <span>Dispatched! Funds Credited</span>
                </>
              ) : isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#412d00] border-t-transparent rounded-full animate-spin" />
                  <span>Broadcasting to PoS Consensus...</span>
                </>
              ) : (
                <>
                  <LockKeyholeOpen size={20} />
                  <span>Confirm &amp; Cashout {formatNim(amount)} NIM</span>
                </>
              )}
            </button>

            {/* Signature Security Footer */}
            <div className="flex items-center justify-center gap-1.5 py-1 text-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#68f5b8]" />
              <span className="text-[10px] text-[#d4c5ad] font-mono">
                Secured by Nimiq Cryptographic Key · Zero Gas Settlement
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
