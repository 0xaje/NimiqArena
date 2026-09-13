import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Wallet,
  Download,
  ShieldCheck,
  Zap,
  Gamepad2,
  Receipt,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatNim } from "@shared/game/pot-distribution";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

export interface CashoutReceiptData {
  amountNim: number;
  txHash?: string;
  blockHeight?: number;
  timestamp?: string;
  senderAddress?: string;
  recipientAddress?: string;
  recipientName?: string;
  remainingVaultNim?: number;
  inPlayNim?: number;
}

interface CashoutReceiptModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  data?: CashoutReceiptData;
}

const DEFAULT_RECEIPT_DATA: CashoutReceiptData = {
  amountNim: 500,
  txHash: "0x8f3c7b209e14a1c5d91a",
  blockHeight: 3982416,
  timestamp: "Oct 24, 2024 · 14:42:08 UTC",
  senderAddress: "NQ42 8K9L 27MN 91BZ",
  recipientAddress: "NQ07 39F2 88KA 19BL 4920 32F1",
  recipientName: "Valkyrie Vault (Nimiq Pay)",
  remainingVaultNim: 920,
  inPlayNim: 100,
};

export function CashoutReceiptModal({
  isOpen = true,
  onClose,
  data = DEFAULT_RECEIPT_DATA,
}: CashoutReceiptModalProps) {
  const [, setLocation] = useLocation();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const receipt = { ...DEFAULT_RECEIPT_DATA, ...data };
  const usdAmount = (receipt.amountNim * 0.2).toFixed(2);
  const remainingUsd = (receipt.remainingVaultNim! * 0.2).toFixed(2);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleShareReceipt = () => {
    const text = `NIMIQ ARENA DISPATCH RECEIPT\nAmount: ${receipt.amountNim} NIM ($${usdAmount} USD)\nStatus: Settled On-Chain\nBlock: #${receipt.blockHeight}\nTx: ${receipt.txHash}\nDestination: ${receipt.recipientName} (${receipt.recipientAddress})`;
    navigator.clipboard.writeText(text);
    toast.success("Cryptographic receipt copied to clipboard!");
  };

  const handleDownloadReceipt = () => {
    const receiptJson = {
      protocol: "Nimiq Arena Albatross PoS",
      type: "Instant Non-Custodial Cashout",
      amountNim: receipt.amountNim,
      amountUsd: usdAmount,
      txHash: receipt.txHash,
      blockHeight: receipt.blockHeight,
      timestamp: receipt.timestamp,
      sender: receipt.senderAddress,
      recipient: receipt.recipientAddress,
      gasRelayed: true,
      signatureStatus: "CRYPTOGRAPHICALLY_VERIFIED",
    };

    const blob = new Blob([JSON.stringify(receiptJson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nimiq-arena-receipt-${receipt.txHash?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Cryptographic receipt JSON saved!");
  };

  const handleReturnLobby = () => {
    if (onClose) {
      onClose();
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans select-none pb-safe">
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] shadow-2xl relative">
        {/* ========================================================================= */}
        {/* TOP NAVIGATION & BLOCK TELEMETRY BAR                                      */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={handleReturnLobby}
            className="w-10 h-10 rounded-full bg-[#151b29] border border-[#242a39] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6] active:scale-90 transition-transform"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#151b29] border border-[#242a39] shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68f5b8] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#68f5b8]" />
            </span>
            <span className="text-[10px] text-[#68f5b8] font-mono font-bold tracking-wide">
              FINALITY REACHED
            </span>
            <span className="text-[10px] text-[#d4c5ad]/60">·</span>
            <span className="text-[10px] text-[#d4c5ad] font-mono">#{receipt.blockHeight}</span>
          </div>

          <button
            type="button"
            onClick={handleShareReceipt}
            className="w-10 h-10 rounded-full bg-[#151b29] border border-[#242a39] flex items-center justify-center text-[#d4c5ad] hover:text-[#ffd78d] active:scale-90 transition-transform"
            title="Share Receipt"
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MAIN RECEIPT BODY                                                         */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col px-4 space-y-4 pb-24">
          {/* Hero Success Ring & Settlement Core */}
          <div className="flex flex-col items-center text-center space-y-2 py-2 relative">
            {/* Ambient Radial Glow */}
            <div className="absolute -top-6 w-56 h-56 rounded-full bg-[#f3b72c]/10 blur-3xl pointer-events-none" />

            {/* Hexagonal Nimiq Shield Badge */}
            <div className="relative flex items-center justify-center w-24 h-24 my-1">
              <svg
                className="w-full h-full text-[#f3b72c] drop-shadow-[0_0_24px_rgba(243,183,44,0.35)]"
                fill="none"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M50 4L88.9711 26.5V71.5L50 94L11.0289 71.5V26.5L50 4Z"
                  fill="#191F2E"
                  stroke="#F3B72C"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
                <path
                  d="M50 16L78.5771 32.5V65.5L50 82L21.4229 65.5V32.5L50 16Z"
                  fill="#151B29"
                  stroke="#FFD78D"
                  strokeLinejoin="round"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle2 size={38} className="text-[#f3b72c] drop-shadow-[0_0_12px_#f3b72c]" />
              </div>
            </div>

            {/* Settlement Headline */}
            <div className="space-y-0.5 z-10">
              <span className="text-[10px] uppercase tracking-widest text-[#d4c5ad] font-mono font-bold">
                Instant Dispatch Complete
              </span>
              <h1 className="text-2xl font-black text-[#dde2f6] tracking-tight">
                Cashout Dispatched
              </h1>
            </div>

            {/* Amount Display Hero */}
            <div className="flex flex-col items-center z-10">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl leading-none font-black text-[#ffd78d] tracking-tight drop-shadow-[0_0_16px_rgba(243,183,44,0.25)] font-mono">
                  +{formatNim(receipt.amountNim)}
                </span>
                <span className="text-base font-bold text-[#ffdea4] tracking-wide font-mono">
                  NIM
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[#d4c5ad] font-mono">≈ ${usdAmount} USD</span>
                <span className="text-[#2f3544] text-xs">|</span>
                <span className="text-xs text-[#68f5b8] font-mono font-medium">Rate: $0.20/NIM</span>
              </div>
            </div>

            {/* Fast Finality Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#242a39]/80 border border-[#2f3544] shadow-sm z-10">
              <Zap size={13} className="text-[#00d2ff]" />
              <span className="text-[10px] text-[#00d2ff] font-mono tracking-wide font-bold">
                &lt; 1s Albatross PoS Finality · On-Chain
              </span>
            </div>
          </div>

          {/* Cryptographic Transaction Receipt Card */}
          <div className="flex flex-col rounded-2xl bg-[#151b29] border border-[#242a39] shadow-lg overflow-hidden">
            {/* Receipt Header Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#191f2e] border-b border-[#242a39]">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-[#ffd78d]" />
                <span className="text-xs font-bold text-[#dde2f6] uppercase tracking-wider font-mono">
                  Proof of Transfer
                </span>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#242a39] text-[#68f5b8] font-mono font-bold uppercase tracking-wider border border-[#2f3544]">
                Non-Custodial
              </span>
            </div>

            {/* Receipt Line Items */}
            <div className="p-4 space-y-3">
              {/* Status Line */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#d4c5ad]">Transaction Status</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#68f5b8]/15 text-[#68f5b8] text-[10px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#68f5b8] shadow-[0_0_6px_#68f5b8]" />
                  Settled / Confirmed
                </span>
              </div>

              {/* Timestamp */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#d4c5ad]">Timestamp</span>
                <span className="text-[#dde2f6] font-mono text-[11px]">{receipt.timestamp}</span>
              </div>

              {/* Origin Escrow Contract */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#d4c5ad]">Sender (Escrow)</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(receipt.senderAddress!, "Escrow Address")}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#191f2e] border border-[#242a39] hover:bg-[#242a39] active:scale-95 transition-all"
                >
                  <span className="text-[11px] text-[#dde2f6] font-mono">
                    {receipt.senderAddress}
                  </span>
                  {copiedField === "Escrow Address" ? (
                    <Check size={12} className="text-[#68f5b8]" />
                  ) : (
                    <Copy size={12} className="text-[#d4c5ad]" />
                  )}
                </button>
              </div>

              {/* Recipient Nimiq Pay Address */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <span className="text-[#d4c5ad]">Destination</span>
                  <span className="text-[10px] text-[#00d2ff] font-mono font-medium">
                    {receipt.recipientName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(receipt.recipientAddress!, "Recipient Address")}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#191f2e] border border-[#242a39] hover:bg-[#242a39] active:scale-95 transition-all"
                >
                  <span className="text-[11px] text-[#dde2f6] font-mono">
                    {receipt.recipientAddress?.slice(0, 9)} ···· {receipt.recipientAddress?.slice(-4)}
                  </span>
                  <ShieldCheck size={13} className="text-[#68f5b8]" />
                </button>
              </div>

              {/* Tx Hash Divider Line */}
              <div className="h-[1px] bg-[#242a39] my-1" />

              {/* Transaction Hash ID */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#d4c5ad]">Tx Hash</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(receipt.txHash!, "Tx Hash")}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#191f2e] border border-[#242a39] hover:bg-[#242a39] active:scale-95 transition-all"
                >
                  <span className="text-[11px] text-[#ffd78d] font-mono">
                    {receipt.txHash?.slice(0, 6)}···{receipt.txHash?.slice(-4)}
                  </span>
                  {copiedField === "Tx Hash" ? (
                    <Check size={12} className="text-[#68f5b8]" />
                  ) : (
                    <Copy size={12} className="text-[#ffd78d]/80" />
                  )}
                </button>
              </div>

              {/* Block Height */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#d4c5ad]">Albatross Block Height</span>
                <span className="text-[#dde2f6] font-mono text-xs">#{receipt.blockHeight}</span>
              </div>

              {/* Network Fee Relayed */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#d4c5ad]">Network Relayer Fee</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#d4c5ad]/60 line-through font-mono text-[10px]">
                    0.0138 NIM
                  </span>
                  <span className="text-[10px] text-[#68f5b8] font-bold font-mono bg-[#68f5b8]/15 px-1.5 py-0.5 rounded">
                    FREE (Arena Relayed)
                  </span>
                </div>
              </div>

              {/* Gross Total Row */}
              <div className="pt-2 flex items-center justify-between bg-[#080e1c] border border-[#242a39] -mx-4 px-4 py-3">
                <span className="text-xs font-bold text-[#dde2f6]">Total Transferred</span>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-[#ffd78d]">
                    {formatNim(receipt.amountNim)}.00000 NIM
                  </span>
                  <p className="text-[10px] text-[#68f5b8] font-mono">
                    Available instantly in Nimiq Pay
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Nimiq Explorer Card Anchor */}
          <a
            href={`https://testnet.nimiq.watch/#/${receipt.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#151b29] hover:bg-[#191f2e] border border-[#242a39] active:scale-[0.99] transition-all shadow-md group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#242a39] border border-[#2f3544] flex items-center justify-center text-[#00d2ff]">
                <ExternalLink size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#dde2f6] group-hover:text-[#ffd78d] transition-colors flex items-center gap-1">
                  View on Nimiq Watch
                  <ChevronRight size={13} />
                </span>
                <span className="text-[10px] text-[#d4c5ad]">
                  Inspect validator signatures &amp; PoS root
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#00d2ff] bg-[#00d2ff]/10 px-2 py-0.5 rounded-full border border-[#00d2ff]/20">
              Live Block
            </span>
          </a>

          {/* Post-Cashout Vault Snapshot */}
          <div className="rounded-2xl bg-[#191f2e] border border-[#242a39] p-4 space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#d4c5ad] font-mono font-bold">
                Updated Player Vault
              </span>
              <span className="flex items-center gap-1 text-[#68f5b8] text-[10px] font-mono font-semibold">
                <RotateCw size={11} className="animate-spin" /> Synchronized
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] flex flex-col">
                <span className="text-[10px] text-[#d4c5ad]">Available NIM</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-bold text-[#dde2f6] font-mono">
                    {formatNim(receipt.remainingVaultNim!)}
                  </span>
                  <span className="text-[10px] text-[#ffd78d] font-bold font-mono">NIM</span>
                </div>
                <span className="text-[10px] text-[#d4c5ad]/80 font-mono mt-0.5">
                  ≈ ${remainingUsd} USD
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] flex flex-col">
                <span className="text-[10px] text-[#d4c5ad]">Escrow In-Play</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-bold text-[#dde2f6] font-mono">
                    {formatNim(receipt.inPlayNim!)}
                  </span>
                  <span className="text-[10px] text-[#ffd78d] font-bold font-mono">NIM</span>
                </div>
                <span className="text-[10px] text-[#00d2ff] font-mono mt-0.5 font-medium">
                  1 Active Match
                </span>
              </div>
            </div>
          </div>

          {/* Primary Bottom Actions Ergonomics Thumb-Zone */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleReturnLobby}
              className="h-12 w-full rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-black text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_-2px_rgba(243,183,44,0.35)] active:scale-[0.98] transition-transform"
            >
              <Gamepad2 size={18} />
              Return to Arena Lobby
            </button>

            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://wallet.nimiq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 rounded-xl bg-[#242a39] hover:bg-[#2f3544] border border-[#2f3544] text-[#dde2f6] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
              >
                <Wallet size={15} className="text-[#00d2ff]" />
                Open Nimiq Pay
              </a>

              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="h-11 rounded-xl bg-[#242a39] hover:bg-[#2f3544] border border-[#2f3544] text-[#dde2f6] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Download size={15} className="text-[#ffd78d]" />
                Save Receipt
              </button>
            </div>

            {/* Cryptographic Non-Custodial Guarantee Footnote */}
            <div className="flex items-center justify-center gap-1.5 pt-2 px-2 text-center">
              <ShieldCheck size={14} className="text-[#68f5b8] shrink-0" />
              <p className="text-[10px] leading-tight text-[#d4c5ad]/80">
                Non-custodial dispatch. Arena smart escrow has signed release. Funds reside in your self-custody wallet.
              </p>
            </div>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
