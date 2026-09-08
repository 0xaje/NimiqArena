import React, { useState, useEffect } from "react";
import { User, X, Check, AlertCircle, Sparkles, Shield, Gift } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface IdentityRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName?: string | null;
  onSuccess?: (newName: string) => void;
}

export function IdentityRegistrationModal({
  isOpen,
  onClose,
  currentName,
  onSuccess,
}: IdentityRegistrationModalProps) {
  const [username, setUsername] = useState(currentName || "");
  const [referralCode, setReferralCode] = useState("");
  const [debouncedName, setDebouncedName] = useState("");

  const utils = trpc.useUtils();
  const registerMutation = trpc.auth.registerIdentity.useMutation();

  // Read ?ref= from URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        setReferralCode(ref);
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim();
    if (clean.length < 2 || clean.length > 30) {
      toast.error("Username must be between 2 and 30 characters.");
      return;
    }
    if (isAvailable === false) {
      toast.error("That username is already taken. Please choose another.");
      return;
    }

    try {
      toast.loading("Registering Arena Web3 Identity...", { id: "register-id" });
      const res = await registerMutation.mutateAsync({
        username: clean,
        referralCode: referralCode.trim() || undefined,
      });
      await utils.auth.me.invalidate();
      await utils.auth.getReferralStats.invalidate();
      toast.success("Identity Claimed!", {
        id: "register-id",
        description: `Welcome to the Arena, ${clean}! 1,000 Welcome Points awarded.`,
      });
      onSuccess?.(clean);
      onClose();
    } catch (err) {
      toast.error("Failed to register identity", {
        id: "register-id",
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #131724 0%, #0c101a 100%)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "480px",
          padding: "26px",
          color: "#f8fafc",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.15)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <User size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                CHOOSE ARENA IDENTITY
              </h2>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Claim your unique nickname on the Nimiq network
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Welcome Points Reward Badge */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.05))",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "12px",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <Gift size={20} color="#4ade80" />
          <div style={{ fontSize: "0.78rem" }}>
            <strong style={{ color: "#4ade80", display: "block" }}>
              🎁 +1,000 ARENA POINTS WELCOME BONUS
            </strong>
            <span style={{ color: "#94a3b8" }}>
              Credited instantly upon identity confirmation. Convertible to NIM/USDT.
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Username Input */}
          <div>
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#cbd5e1",
                marginBottom: "6px",
              }}
            >
              <span>NICKNAME / HANDLE</span>
              {debouncedName.length >= 2 && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: isChecking
                      ? "#94a3b8"
                      : isAvailable
                        ? "#4ade80"
                        : "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isChecking ? (
                    "Checking availability…"
                  ) : isAvailable ? (
                    <>
                      <Check size={12} /> AVAILABLE
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} /> ALREADY TAKEN
                    </>
                  )}
                </span>
              )}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="e.g. Jack, NimiqKing, Satoshi"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                maxLength={30}
                autoFocus
                style={{
                  width: "100%",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: isAvailable === false
                    ? "1px solid #ef4444"
                    : isAvailable === true
                      ? "1px solid #22c55e"
                      : "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>
            <span style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "4px", display: "block" }}>
              Your handle will appear on the global leaderboard, table matches, and invite links.
            </span>
          </div>

          {/* Referral Code Input */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#cbd5e1",
                marginBottom: "6px",
              }}
            >
              INVITED BY A FRIEND? (REFERRAL CODE)
            </label>
            <input
              type="text"
              placeholder="Enter friend's handle or code (optional)"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "#ffffff",
                fontSize: "0.85rem",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* Confirm Button */}
          <button
            type="submit"
            disabled={registerMutation.isPending || !username.trim() || isAvailable === false}
            style={{
              marginTop: "8px",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "14px",
              fontSize: "0.95rem",
              fontWeight: 800,
              cursor: registerMutation.isPending || isAvailable === false ? "not-allowed" : "pointer",
              boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: isAvailable === false ? 0.6 : 1,
            }}
          >
            <Sparkles size={18} />
            {registerMutation.isPending ? "Claiming..." : "CLAIM IDENTITY & SIGN"}
          </button>
        </form>
      </div>
    </div>
  );
}
