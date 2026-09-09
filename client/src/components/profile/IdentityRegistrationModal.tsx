import React, { useState, useEffect } from "react";
import { User, X, Check, AlertCircle, Sparkles, Shield, Gift, Wallet, Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { signIdentityMessage } from "@/lib/nimiq-wallet";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";

interface IdentityRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName?: string | null;
  currentAvatar?: string | null;
  walletAddress?: string | null;
  onSuccess?: (newName: string, avatar: string) => void;
}

export const AVATAR_PRESETS = [
  { id: "gladiator", label: "Arena Gladiator", icon: "🛡️", color: "#EC9918", bg: "linear-gradient(135deg, #1e1b18 0%, #2d2417 100%)" },
  { id: "cyberpunk", label: "Cyber Punk", icon: "⚡", color: "#00f0ff", bg: "linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%)" },
  { id: "sovereign", label: "Gold Sovereign", icon: "👑", color: "#f59e0b", bg: "linear-gradient(135deg, #2b2100 0%, #3d2f00 100%)" },
  { id: "phoenix", label: "Phoenix Ascendant", icon: "🔥", color: "#ff5e3a", bg: "linear-gradient(135deg, #2a0800 0%, #401200 100%)" },
  { id: "mage", label: "Mystic Mage", icon: "🔮", color: "#a855f7", bg: "linear-gradient(135deg, #1f082e 0%, #301047 100%)" },
  { id: "wolf", label: "Shadow Wolf", icon: "🐺", color: "#94a3b8", bg: "linear-gradient(135deg, #14161a 0%, #22262d 100%)" },
  { id: "samurai", label: "Cyber Samurai", icon: "⚔️", color: "#ef4444", bg: "linear-gradient(135deg, #280707 0%, #450f0f 100%)" },
  { id: "dragon", label: "Dragon Lord", icon: "🐉", color: "#10b981", bg: "linear-gradient(135deg, #062217 0%, #0d3827 100%)" },
];

export function IdentityRegistrationModal({
  isOpen,
  onClose,
  currentName,
  currentAvatar,
  walletAddress,
  onSuccess,
}: IdentityRegistrationModalProps) {
  const [username, setUsername] = useState(currentName || "");
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || AVATAR_PRESETS[0].id);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  const utils = trpc.useUtils();
  const registerMutation = trpc.auth.registerIdentity.useMutation();

  // Read ?ref= from URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) setReferralCode(ref);
    }
  }, []);

  // Debounce username input for availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(username.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [username]);

  const availabilityQuery = trpc.auth.checkUsername.useQuery(
    { username: debouncedName },
    { enabled: debouncedName.length >= 2 }
  );

  const isAvailable = availabilityQuery.data?.isAvailable;
  const isChecking = availabilityQuery.isFetching;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem("dismissed_identity_modal", "true");
    } catch {}
    onClose();
  };

  useModalBackHandler(isOpen, handleDismiss);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim();
    if (clean.length < 2 || clean.length > 30) {
      toast.error("Nickname must be between 2 and 30 characters.");
      return;
    }
    if (isAvailable === false) {
      toast.error("That handle is already taken. Please choose another.");
      return;
    }

    const finalAvatar = useCustomUrl && customAvatarUrl.trim()
      ? customAvatarUrl.trim()
      : selectedAvatar;

    try {
      setIsSigning(true);
      toast.info("Wallet Confirmation Prompt", {
        description: "Please confirm ownership and bind your identity to your Nimiq address…",
      });

      // Wallet confirmation popup request
      const messageToSign = `Confirm Nimiq Arena Identity Registration:\nHandle: ${clean}\nAvatar: ${finalAvatar}\nTimestamp: ${Date.now()}`;
      await signIdentityMessage(messageToSign, walletAddress || undefined);

      toast.loading("Locking identity on Nimiq Arena…", { id: "register-id" });

      const res = await registerMutation.mutateAsync({
        username: clean,
        avatar: finalAvatar,
        referralCode: referralCode.trim() || undefined,
      });

      if ((res as any)?.token) {
        try {
          sessionStorage.setItem("manus-cookie", `manus-session=${(res as any).token}`);
          localStorage.setItem("manus-cookie", `manus-session=${(res as any).token}`);
        } catch {}
      }
      if (walletAddress) {
        try {
          localStorage.setItem(`onboarding_completed_${walletAddress}`, "true");
        } catch {}
      }
      try {
        localStorage.setItem("arena_registered_nickname", clean);
      } catch {}

      await utils.auth.me.invalidate();
      await utils.auth.getReferralStats.invalidate();

      toast.success("Identity Permanently Registered!", {
        id: "register-id",
        description: `Welcome to Nimiq Arena, @${clean}! Check your Profile to claim rewards.`,
      });

      onSuccess?.(clean, finalAvatar);
      onClose();
    } catch (err) {
      toast.error("Identity confirmation failed", {
        id: "register-id",
        description: err instanceof Error ? err.message : "Registration was cancelled or rejected.",
      });
    } finally {
      setIsSigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => e.target === e.currentTarget && handleDismiss()}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "#111418",
          borderRadius: "20px",
          border: "1px solid rgba(236, 153, 24, 0.3)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7), 0 0 32px rgba(236, 153, 24, 0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 18px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, rgba(236, 153, 24, 0.12) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "rgba(236, 153, 24, 0.15)",
                border: "1px solid rgba(236, 153, 24, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#EC9918",
              }}
            >
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "19px", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "0.2px" }}>
                Player Identity Setup
              </h2>
              <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.55)", margin: "2px 0 0" }}>
                Bind your unique Web3 handle & avatar permanently
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.5)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Connected Wallet Info */}
          {walletAddress && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: "rgba(236, 153, 24, 0.06)",
                border: "1px solid rgba(236, 153, 24, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "rgba(255, 255, 255, 0.6)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Wallet size={14} color="#EC9918" /> Bound Wallet:
              </span>
              <span style={{ color: "#EC9918", fontFamily: "monospace", fontWeight: 700 }}>
                {walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}
              </span>
            </div>
          )}

          {/* Section 1: Choose Nickname */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#EC9918", marginBottom: "8px" }}>
              1. Choose Your Nickname / Handle
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                placeholder="e.g. Jack, CyberHero, Apex"
                maxLength={30}
                required
                style={{
                  width: "100%",
                  padding: "14px 44px 14px 14px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: isAvailable === false
                    ? "1px solid #ef4444"
                    : isAvailable === true
                      ? "1px solid #10b981"
                      : "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                {isChecking ? (
                  <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>Checking…</span>
                ) : isAvailable === true ? (
                  <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 700 }}>
                    <Check size={16} /> Available
                  </span>
                ) : isAvailable === false ? (
                  <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 700 }}>
                    <AlertCircle size={16} /> Taken
                  </span>
                ) : null}
              </div>
            </div>
            <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.45)", margin: "6px 0 0" }}>
              Letters, numbers, underscores and hyphens (2–30 chars).
            </p>
          </div>

          {/* Section 2: Avatar Selection */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#EC9918" }}>
                2. Choose Avatar / Identity Icon
              </label>
              <button
                type="button"
                onClick={() => setUseCustomUrl(!useCustomUrl)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(236, 153, 24, 0.8)",
                  fontSize: "11px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {useCustomUrl ? "Pick preset icon" : "Or use custom image URL"}
              </button>
            </div>

            {useCustomUrl ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="url"
                  placeholder="https://example.com/my-avatar.png"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
                {customAvatarUrl.trim() && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                      src={customAvatarUrl.trim()}
                      alt="Avatar preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                      style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid #EC9918" }}
                    />
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>Image preview</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "10px",
                }}
              >
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = selectedAvatar === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedAvatar(preset.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        padding: "10px 6px",
                        borderRadius: "12px",
                        background: isSelected ? "rgba(236, 153, 24, 0.2)" : "rgba(255, 255, 255, 0.04)",
                        border: isSelected ? "2px solid #EC9918" : "1px solid rgba(255, 255, 255, 0.08)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ fontSize: "24px" }}>{preset.icon}</span>
                      <span style={{ fontSize: "10px", color: isSelected ? "#EC9918" : "rgba(255, 255, 255, 0.7)", fontWeight: 700 }}>
                        {preset.label.split(" ")[1] || preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Optional Referral Code */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)", marginBottom: "6px" }}>
              Referrer Handle (Optional)
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="e.g. Satoshi"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#fff",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Notice Card */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              backgroundColor: "rgba(236, 153, 24, 0.08)",
              border: "1px solid rgba(236, 153, 24, 0.2)",
              display: "flex",
              gap: "10px",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.75)",
              lineHeight: 1.4,
            }}
          >
            <Sparkles size={18} color="#EC9918" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ color: "#EC9918" }}>Permanent Web3 Profile:</strong> Confirming triggers a wallet verification popup that binds this handle and avatar to your Nimiq address forever unless you update it later.
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={registerMutation.isPending || isSigning || (isAvailable === false)}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: "12px",
              backgroundColor: "#EC9918",
              border: "none",
              color: "#111",
              fontSize: "15px",
              fontWeight: 800,
              cursor: registerMutation.isPending || isSigning ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 20px rgba(236, 153, 24, 0.4)",
              transition: "transform 0.15s ease",
            }}
          >
            <Shield size={18} />
            {isSigning
              ? "Confirming in Wallet…"
              : registerMutation.isPending
                ? "Registering…"
                : "Approve & Confirm in Wallet"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "10px",
              backgroundColor: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.15s ease",
            }}
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
