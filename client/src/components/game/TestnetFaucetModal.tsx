import React, { useState } from "react";
import { Copy, Check, ExternalLink, Droplet, Sparkles, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

interface TestnetFaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress?: string | null;
}

export function TestnetFaucetModal({
  isOpen,
  onClose,
  userAddress,
}: TestnetFaucetModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const faucetUrl = "https://faucet.pos.nimiq-testnet.com/";

  const handleCopy = () => {
    if (userAddress) {
      navigator.clipboard.writeText(userAddress);
      setCopied(true);
      toast.success("Nimiq address copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.info("Connect your Nimiq Wallet or create a match first!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#1F252E] border border-[#EC9918]/30 rounded-2xl p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EC9918] to-[#FFC107] flex items-center justify-center shadow-lg shadow-[#EC9918]/20">
            <Droplet className="w-5 h-5 text-[#1F252E]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Nimiq Testnet Faucet
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#EC9918]/20 text-[#EC9918] border border-[#EC9918]/40 font-mono">
                PoS Albatross
              </span>
            </h3>
            <p className="text-xs text-gray-400">Get free Testnet NIM to play real matches</p>
          </div>
        </div>

        {/* Step by step guide */}
        <div className="space-y-3 mb-6 text-sm text-gray-300">
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-2">
            <div className="text-xs font-semibold text-[#EC9918] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 1. Your Nimiq Address
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={userAddress || "NQ... (Connect Nimiq Wallet)"}
                className="w-full bg-[#14181F] text-xs font-mono text-gray-200 px-3 py-2 rounded-lg border border-white/10 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                disabled={!userAddress}
                className="px-3 py-2 rounded-lg bg-[#EC9918] hover:bg-[#ffaa22] text-[#1F252E] font-medium text-xs flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {copied ? <Check className="w-4 h-4 text-green-900" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
            <div className="text-xs font-semibold text-[#EC9918] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 2. Claim Free NIM (Instant PoS Finality)
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Open the official Nimiq PoS Testnet Faucet, paste your address, and receive free Testnet NIM immediately.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <a
            href={faucetUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#EC9918] to-[#FFC107] hover:from-[#ffaa22] hover:to-[#ffd54f] text-[#1F252E] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#EC9918]/25 transition-all"
          >
            Open Faucet <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
