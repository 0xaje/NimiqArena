import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Share2,
  Code,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ArrowDown,
  Lock,
  Wallet,
  ExternalLink,
  Dice5,
  Layers,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

export default function NimiqWatchExplorer() {
  const [, setLocation] = useLocation();
  const [showJsonView, setShowJsonView] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const rawTxHash = "0x9a4f21e8b7c938d2f0a174c831e5bc198246a41f92c4b810d72810a971d2b9";
  const stateRootHash = "0x7f4b802ae91ac24ff8b19238";
  const vrfSeed = "0x3e8ac49281a94b8e3104f291blitz24";
  const blockHeight = 3983120;
  const epochNumber = 31118;
  const amountNim = 10000;
  const amountUsd = (amountNim * 0.2).toFixed(2);

  const rawPayloadJson = {
    blockHeight,
    epoch: epochNumber,
    batch: 4,
    consensus: "ALBATROSS_POS",
    latencySeconds: 0.72,
    validatorQuorum: "128/128 (100% Unanimous)",
    stateRootHash,
    transaction: {
      hash: rawTxHash,
      type: "SMART_CONTRACT_ESCROW_DISPATCH",
      status: "SETTLED_AND_FINALIZED",
      timestamp: "2024-10-24T18:42:15Z",
      sender: {
        label: "Arena S4 Escrow Multi-Sig",
        address: "NQ42 8K9L 21M9 GLDN 4001 91BZ",
        amountDebitedNim: amountNim,
      },
      recipient: {
        label: "Valkyrie · Gold Legion Vault",
        address: "NQ07 39F2 A88B GLDN 0024 32F1",
        amountCreditedNim: amountNim,
      },
      feeLuna: 0,
      feeSponsoredByRelayer: true,
      eventLog: {
        event: "EscrowDispatched",
        tournamentId: "S4-GRAND-FINALS",
        winnerClan: "GLDN",
        beneficiary: "NQ07 39F2 A88B GLDN 0024 32F1",
        shareAllocation: "ROSTER_DIVIDEND_AND_MVP",
        rosterShareNIM: 5000.0,
        mvpBonusNIM: 5000.0,
        totalPayoutLuna: 1000000000000,
        vrfSeed,
      },
    },
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Nimiq Watch: S4 Finals Escrow Payout",
          text: `Championship Escrow Payout of ${amountNim.toLocaleString()} NIM verified on Nimiq Watch`,
          url: window.location.href,
        })
        .catch(() => {
          handleCopy(window.location.href, "Replay Link");
        });
    } else {
      handleCopy(window.location.href, "Replay Link");
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans select-none pb-safe">
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] shadow-2xl relative">
        {/* ========================================================================= */}
        {/* EXPLORER CONTEXT BANNER / BREADCRUMB                                      */}
        {/* ========================================================================= */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-[#242a39]">
          <Link href="/playoffs">
            <button
              type="button"
              className="flex items-center gap-1.5 text-[#d4c5ad] hover:text-[#ffd78d] active:scale-95 transition-all text-xs font-mono font-bold uppercase"
            >
              <ArrowLeft size={16} className="text-[#a5e7ff]" />
              <span>Championship Trophy</span>
            </button>
          </Link>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShare}
              className="w-8 h-8 rounded-full bg-[#191f2e] border border-[#242a39] flex items-center justify-center text-[#d4c5ad] hover:text-[#ffd78d] transition-colors active:scale-95 shadow-sm"
              title="Share Proof"
            >
              <Share2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => setShowJsonView(!showJsonView)}
              className={`h-8 px-2.5 rounded-full border text-[11px] font-mono font-bold flex items-center gap-1 transition-all shadow-sm ${
                showJsonView
                  ? "bg-[#00d2ff] text-[#003543] border-[#00d2ff]"
                  : "bg-[#191f2e] border-[#242a39] text-[#d4c5ad] hover:text-[#00d2ff]"
              }`}
            >
              <Code size={13} />
              <span>{showJsonView ? "PRETTY" : "JSON"}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* EXPLORER TITLE & NETWORK STATUS                                           */}
        {/* ========================================================================= */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-[#242a39] border border-[#2f3544] shadow-md">
                <svg className="w-4 h-4 text-[#f3b72c] fill-current" viewBox="0 0 24 24">
                  <path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2zm0 2.311L4.85 8.443v7.114L12 19.689l7.15-4.132V8.443L12 4.311z" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#68f5b8] shadow-[0_0_8px_#68f5b8]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-[#dde2f6] tracking-tight">
                    Nimiq Watch
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#00d2ff]/15 text-[#00d2ff] border border-[#00d2ff]/20 font-bold uppercase">
                    ALBATROSS PoS
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#d4c5ad]">
                  Mainnet Epoch #{epochNumber.toLocaleString()} · Microblock Verification
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#68f5b8]/15 border border-[#68f5b8]/20 text-[#68f5b8] text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#68f5b8] animate-pulse" />
              <span>0.72s Final</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* JSON RAW CODE VIEW (IF TOGGLED)                                           */}
        {/* ========================================================================= */}
        {showJsonView ? (
          <div className="px-4 flex flex-col gap-3 pb-24">
            <div className="p-3 rounded-2xl bg-[#151b29] border border-[#242a39] shadow-xl">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#242a39] text-xs font-mono">
                <span className="text-[#ffd78d] font-bold">RAW RPC RESPONSE</span>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(rawPayloadJson, null, 2), "JSON Payload")}
                  className="text-[#00d2ff] hover:underline flex items-center gap-1"
                >
                  <Copy size={12} />
                  <span>Copy JSON</span>
                </button>
              </div>
              <pre className="text-[10px] font-mono leading-relaxed text-[#68f5b8] overflow-x-auto p-2 bg-[#080e1c] rounded-xl border border-[#242a39] max-h-[500px]">
                {JSON.stringify(rawPayloadJson, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="px-4 flex flex-col gap-3 pb-24">
            {/* ======================================================================= */}
            {/* HERO CARD: FINALIZED SETTLEMENT & DIVIDEND AMOUNT                       */}
            {/* ======================================================================= */}
            <div className="relative overflow-hidden rounded-2xl bg-[#191f2e] border border-[#242a39] p-4 shadow-xl">
              <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-[#f3b72c]/10 blur-2xl pointer-events-none" />
              <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-[#00d2ff]/10 blur-2xl pointer-events-none" />

              {/* Settlement Status Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#68f5b8]/15 border border-[#68f5b8]/20 text-[#68f5b8] shadow-sm">
                  <ShieldCheck size={14} className="text-[#68f5b8]" />
                  <span className="text-[10px] font-mono font-bold tracking-wider">
                    SETTLED &amp; FINALIZED
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#d4c5ad]">
                  Oct 24, 2024 · 18:42:15 UTC
                </span>
              </div>

              {/* Main Value Payout */}
              <div className="flex flex-col items-center text-center py-1">
                <span className="text-[10px] font-mono text-[#ffd78d] uppercase tracking-widest font-bold mb-0.5">
                  Championship Dividend Escrow
                </span>
                <div className="flex items-baseline gap-1.5 drop-shadow-[0_2px_12px_rgba(243,183,44,0.35)]">
                  <span className="text-3xl font-black text-[#ffd78d] tracking-tight font-mono">
                    +{amountNim.toLocaleString()}.00
                  </span>
                  <span className="text-base font-bold text-[#ffdea4] font-mono">NIM</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                  <span className="text-[#d4c5ad]">≈ ${amountUsd} USD</span>
                  <span className="w-1 h-1 rounded-full bg-[#2f3544]" />
                  <span className="text-[#68f5b8] font-medium">0% Fee (Sponsored Relayer)</span>
                </div>
              </div>

              {/* Escrow Tag Pill */}
              <div className="mt-3 p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Layers size={16} className="text-[#ffd78d] shrink-0" />
                  <span className="text-xs text-[#dde2f6] truncate font-medium">
                    Season 4 Grand Finals · Roster Dividend &amp; MVP Bonus
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#00d2ff] bg-[#00d2ff]/15 border border-[#00d2ff]/20 shrink-0 px-2 py-0.5 rounded-md font-bold">
                  GLDN
                </span>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* TRANSACTION HASH & BLOCK BAR                                            */}
            {/* ======================================================================= */}
            <div className="rounded-2xl bg-[#151b29] border border-[#242a39] p-3.5 flex flex-col gap-1.5 shadow-md">
              <div className="flex items-center justify-between text-[#d4c5ad] text-[10px] font-mono">
                <span className="uppercase tracking-wider font-bold">Transaction Identifier</span>
                <span className="text-[#00d2ff] font-bold">Block #{blockHeight.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#080e1c] border border-[#242a39]">
                <span className="text-xs text-[#00d2ff] truncate mr-2 font-mono" id="txHashDisplay">
                  {rawTxHash}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(rawTxHash, "Tx Hash")}
                  className="shrink-0 p-1.5 rounded-lg bg-[#191f2e] border border-[#242a39] text-[#d4c5ad] hover:text-[#ffd78d] active:scale-95 transition-all"
                  title="Copy Hash"
                >
                  {copiedField === "Tx Hash" ? (
                    <Check size={14} className="text-[#68f5b8]" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* TRANSACTION FLOW DIAGRAM: MULTI-SIG CONTRACT TO PLAYER VAULT            */}
            {/* ======================================================================= */}
            <div className="rounded-2xl bg-[#191f2e] border border-[#242a39] p-4 shadow-md flex flex-col gap-3">
              <span className="text-[10px] font-mono text-[#d4c5ad] uppercase tracking-wider font-bold">
                On-Chain Flow Routing
              </span>

              {/* Sender Node */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#151b29] border border-[#242a39]">
                <div className="w-10 h-10 rounded-xl bg-[#242a39] border border-[#2f3544] flex items-center justify-center text-[#ffd78d] shrink-0 shadow-inner">
                  <Lock size={18} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#dde2f6] truncate">
                      Arena S4 Escrow Multi-Sig
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#f3b72c]/15 text-[#ffd78d] shrink-0 font-bold">
                      Contract
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#d4c5ad] truncate mt-0.5">
                    NQ42 8K9L 21M9 GLDN 4001 91BZ
                  </span>
                  <span className="text-[11px] font-mono text-[#ffb4ab] font-bold mt-1">
                    -10,000.00 NIM (Championship Pool Release)
                  </span>
                </div>
              </div>

              {/* Flow Connector Animation Wire */}
              <div className="flex items-center justify-between px-3 my-[-6px]">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-3 bg-[#00d2ff]/40" />
                    <div className="w-5 h-5 rounded-full bg-[#00d2ff]/20 border border-[#00d2ff]/30 flex items-center justify-center text-[#00d2ff] shadow-[0_0_8px_rgba(0,210,255,0.4)]">
                      <ArrowDown size={12} />
                    </div>
                    <div className="w-0.5 h-3 bg-[#00d2ff]/40" />
                  </div>
                  <span className="text-[10px] font-mono text-[#a5e7ff] font-bold">
                    Dispatched across 128/128 Validators
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#68f5b8] px-2 py-0.5 rounded-full bg-[#68f5b8]/15 border border-[#68f5b8]/20 font-bold">
                  Zero Relayer Fee
                </span>
              </div>

              {/* Recipient Node */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#151b29] border border-[#242a39]">
                <div className="w-10 h-10 rounded-xl bg-[#f3b72c]/15 border border-[#f3b72c]/30 flex items-center justify-center text-[#ffd78d] shrink-0 shadow-inner">
                  <Wallet size={18} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#dde2f6] truncate">
                      Valkyrie · Gold Legion Vault
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#68f5b8]/15 text-[#68f5b8] shrink-0 font-bold">
                      Nimiq Pay
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#d4c5ad] truncate mt-0.5">
                    NQ07 39F2 A88B GLDN 0024 32F1
                  </span>
                  <span className="text-[11px] font-mono text-[#68f5b8] font-bold mt-1">
                    +10,000.00 NIM (Claim Finalized)
                  </span>
                </div>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* CRYPTOGRAPHIC CONSENSUS & VALIDATOR PROOF CARD                          */}
            {/* ======================================================================= */}
            <div className="rounded-2xl bg-[#151b29] border border-[#242a39] p-4 shadow-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#d4c5ad] uppercase tracking-wider font-bold">
                  Consensus Verification
                </span>
                <CheckCircle2 size={16} className="text-[#68f5b8]" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-[#191f2e] border border-[#242a39] flex flex-col">
                  <span className="text-[10px] font-mono text-[#d4c5ad]">Albatross Latency</span>
                  <span className="text-lg font-black text-[#00d2ff] font-mono mt-0.5">0.72s</span>
                  <span className="text-[9px] font-mono text-[#68f5b8]">Sub-second final</span>
                </div>
                <div className="p-3 rounded-xl bg-[#191f2e] border border-[#242a39] flex flex-col">
                  <span className="text-[10px] font-mono text-[#d4c5ad]">Validator Quorum</span>
                  <span className="text-lg font-black text-[#ffd78d] font-mono mt-0.5">128 / 128</span>
                  <span className="text-[9px] font-mono text-[#68f5b8]">100% Unanimous</span>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#d4c5ad]">Epoch / Batch</span>
                  <span className="text-[#dde2f6]">Epoch #{epochNumber.toLocaleString()} · Batch #4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#d4c5ad]">State Root Hash</span>
                  <span className="text-[#00d2ff] truncate max-w-[170px]">{stateRootHash}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#d4c5ad]">Security Proof</span>
                  <span className="text-[#68f5b8] font-bold">Dispatched &amp; Burn-Proofed</span>
                </div>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* SMART CONTRACT EVENT LOGS & DISPATCH PAYLOAD                            */}
            {/* ======================================================================= */}
            <div className="rounded-2xl bg-[#191f2e] border border-[#242a39] p-4 shadow-md flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#d4c5ad] uppercase tracking-wider font-bold">
                  Contract Payload &amp; Event Logs
                </span>
                <span className="text-[10px] font-mono text-[#ffd78d] font-bold">
                  Solidity / Nimiq WASM
                </span>
              </div>

              {/* Code Log Display */}
              <div className="rounded-xl bg-[#080e1c] border border-[#242a39] p-3 font-mono text-xs leading-relaxed overflow-x-auto text-[#dde2f6]">
                <p className="text-[#a5e7ff] text-[11px]">
                  <span className="text-[#f3b72c]">event</span> EscrowDispatched(
                </p>
                <div className="pl-3 space-y-0.5 text-[11px]">
                  <p>
                    <span className="text-[#d4c5ad]">tournamentId:</span>{" "}
                    <span className="text-[#68f5b8]">"S4-GRAND-FINALS"</span>,
                  </p>
                  <p>
                    <span className="text-[#d4c5ad]">winnerClan:</span>{" "}
                    <span className="text-[#68f5b8]">"GLDN"</span>,
                  </p>
                  <p>
                    <span className="text-[#d4c5ad]">beneficiary:</span>{" "}
                    <span className="text-[#00d2ff]">"NQ07 39F2...32F1"</span>,
                  </p>
                  <p>
                    <span className="text-[#d4c5ad]">shareAllocation:</span>{" "}
                    <span className="text-[#ffd78d]">"ROSTER_DIVIDEND_AND_MVP"</span>,
                  </p>
                  <p>
                    <span className="text-[#d4c5ad]">rosterShareNIM:</span>{" "}
                    <span className="text-[#dde2f6]">5000.00</span>,
                  </p>
                  <p>
                    <span className="text-[#d4c5ad]">mvpBonusNIM:</span>{" "}
                    <span className="text-[#dde2f6]">5000.00</span>,
                  </p>
                  <p>
                    <span className="text-[#d4c5ad]">totalPayoutLuna:</span>{" "}
                    <span className="text-[#ffd78d] font-bold">1000000000000</span>
                  </p>
                </div>
                <p className="text-[#a5e7ff] text-[11px]">);</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] flex items-center justify-between text-xs mt-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Dice5 size={16} className="text-[#ffd78d]" />
                  <span className="text-[#d4c5ad] text-[10px] font-mono truncate">
                    Fair-Play VRF Seed:
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#dde2f6] truncate max-w-[140px]">
                  {vrfSeed}
                </span>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* ACTION BUTTONS / FOOTER CALL TO ACTION                                  */}
            {/* ======================================================================= */}
            <div className="flex flex-col gap-2 pt-1">
              <a
                href="https://wallet.nimiq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-black text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_-2px_rgba(243,183,44,0.35)] active:scale-[0.98] transition-all text-center"
              >
                <Wallet size={18} />
                <span>Open in Nimiq Pay App</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(rawTxHash, "Raw Hash")}
                  className="h-11 rounded-xl bg-[#191f2e] hover:bg-[#242a39] border border-[#242a39] text-[#dde2f6] text-xs font-mono font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  {copiedField === "Raw Hash" ? (
                    <Check size={16} className="text-[#68f5b8]" />
                  ) : (
                    <Copy size={16} />
                  )}
                  <span>Copy Raw Hash</span>
                </button>

                <a
                  href={`https://testnet.nimiq.watch/#/${blockHeight}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 rounded-xl bg-[#191f2e] hover:bg-[#242a39] border border-[#242a39] text-[#dde2f6] text-xs font-mono font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
                >
                  <ExternalLink size={16} className="text-[#00d2ff]" />
                  <span>View Block #3.98M</span>
                </a>
              </div>
            </div>

            {/* Immutability Guarantee Note */}
            <div className="flex items-center justify-center gap-1.5 px-2 py-1 text-center">
              <Lock size={13} className="text-[#68f5b8] shrink-0" />
              <span className="text-[10px] text-[#d4c5ad]/80 leading-tight font-mono">
                Non-custodial, self-custody verified. Cryptographically immutable on Nimiq PoS.
              </span>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
