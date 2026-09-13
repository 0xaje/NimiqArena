import React, { useState, useEffect, useRef } from "react";
import { User, X, Check, AlertCircle, Sparkles, Shield, Gift, Wallet, Image as ImageIcon, Camera, Loader2 } from "lucide-react";
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const registerMutation = trpc.auth.registerIdentity.useMutation();
  const uploadAvatarMutation = trpc.auth.uploadAvatar.useMutation();

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
      localStorage.setItem("dismissed_identity_modal", "true");
      if (walletAddress) {
        localStorage.setItem(`onboarding_completed_${walletAddress}`, "true");
      }
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
          localStorage.setItem("dismissed_identity_modal", "true");
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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      toast.loading("Processing photo…", { id: "modal-avatar-upload" });
      const reader = new FileReader();
      reader.onload = async () => {
        const img = new Image();
        img.onload = async () => {
          try {
            const targetSize = 256;
            const canvas = document.createElement("canvas");
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas error");
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
            const res = await uploadAvatarMutation.mutateAsync({ dataUrl });
            setCustomAvatarUrl(res.avatar);
            setUseCustomUrl(true);
            toast.success("Photo uploaded successfully!", { id: "modal-avatar-upload" });
          } catch (uploadErr: any) {
            toast.error("Photo upload failed", {
              id: "modal-avatar-upload",
              description: uploadErr?.message || "Could not upload image.",
            });
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error("Photo processing failed", {
        id: "modal-avatar-upload",
        description: err?.message || "Could not read file.",
      });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Hidden File Input for Device Photo Upload */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: "none" }}
          onChange={handlePhotoSelect}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, rgba(236, 153, 24, 0.08) 0%, transparent 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(236, 153, 24, 0.15)",
                border: "1px solid rgba(236, 153, 24, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={18} color="#EC9918" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                Claim Arena Identity
              </h3>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>
                Bind your handle & avatar permanently to Nimiq
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
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
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

          {/* Section 1: Username / Handle */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#EC9918" }}>
                1. Duelist Handle / Nickname
              </label>
              {username.trim().length >= 2 && (
                <span style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                  {isChecking ? (
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Checking...</span>
                  ) : isAvailable === true ? (
                    <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "3px" }}>
                      <Check size={12} /> Available
                    </span>
                  ) : isAvailable === false ? (
                    <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "3px" }}>
                      <AlertCircle size={12} /> Taken
                    </span>
                  ) : null}
                </span>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(236, 153, 24, 0.7)",
                  fontWeight: 700,
                  fontSize: "14px",
                }}
              >
                @
              </span>
              <input
                type="text"
                placeholder="Valkyrie"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                maxLength={30}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 32px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: isAvailable === false ? "1px solid #ef4444" : "1px solid rgba(236, 153, 24, 0.3)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: "rgba(255, 255, 255, 0.4)" }}>
              Letters, numbers, underscores and dashes. Min 2 chars.
            </p>
          </div>

          {/* Section 2: Avatar Selection */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#EC9918" }}>
                2. Choose Avatar / Identity Icon
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  style={{
                    background: "rgba(236, 153, 24, 0.15)",
                    border: "1px solid rgba(236, 153, 24, 0.35)",
                    color: "#EC9918",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isUploadingPhoto ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                  {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
                </button>
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
                  {useCustomUrl ? "Preset icons" : "Image URL"}
                </button>
              </div>
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
