import React from "react";
import {
  ArrowLeft,
  Coins,
  Copy,
  Gem,
  Gift,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ReferralCard } from "@/components/referral/ReferralCard";

export default function Earn() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;

  const claimRewardMutation = trpc.auth.claimWelcomeReward.useMutation();
  const referralStatsQuery = trpc.auth.getReferralStats.useQuery(undefined, {
    enabled: Boolean(user),
  });

  const referralData = referralStatsQuery.data;
  const isClaimed = Boolean((user as any)?.welcomeClaimed);
  const points = (user as any)?.points ?? 1000;
  const usdValue = (points / 100).toFixed(2);

  async function handleClaimWelcome() {
    try {
      const res = await claimRewardMutation.mutateAsync();
      await utils.auth.me.invalidate();
      await utils.auth.getReferralStats.invalidate();
      toast.success("Welcome Gift Claimed!", {
        description: res.message || "+1,000 Arena Points added to your balance!",
      });
    } catch (err) {
      toast.error("Claim failed", {
        description: err instanceof Error ? err.message : "Try again later",
      });
    }
  }

  return (
    <div className="detail-page">
      <header className="detail-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> Arena home
        </Link>
        <span className="detail-brand">NIMIQ ARENA / EARN & REWARDS</span>
        <span className="detail-state">
          {user ? `SIGNED IN: ${user.name || "PLAYER"}` : "GUEST MODE"}
        </span>
      </header>

      <main className="detail-main" style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "48px" }}>
        {/* Hero Banner */}
        <section className="room-hero" style={{ textAlign: "center", marginBottom: "32px" }}>
          <span className="stamp orange">REWARDS & EARNINGS HUB</span>
          <p className="eyebrow">ARENA ECONOMY</p>
          <h1>
            Play, Refer &amp;
            <br />
            <em>Earn with the Arena.</em>
          </h1>
          <p className="detail-lede" style={{ maxWidth: "560px", margin: "0 auto" }}>
            Claim your 1,000 Welcome Points, share your custom handle to earn 5% on all friend wins, and build your competitive bankroll.
          </p>
        </section>

        {/* 1. Welcome Bonus Claim Card */}
        <section
          style={{
            padding: "24px 28px",
            borderRadius: "20px",
            backgroundColor: "#16191f",
            border: isClaimed ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(236, 153, 24, 0.4)",
            boxShadow: isClaimed
              ? "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(16, 185, 129, 0.1)"
              : "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(236, 153, 24, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                backgroundColor: isClaimed ? "rgba(16, 185, 129, 0.15)" : "rgba(236, 153, 24, 0.15)",
                border: isClaimed ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(236, 153, 24, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Gift size={26} color={isClaimed ? "#10b981" : "#EC9918"} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: isClaimed ? "#10b981" : "#EC9918",
                  }}
                >
                  WELCOME REWARD
                </span>
                {isClaimed && (
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      fontWeight: 700,
                    }}
                  >
                    ✓ CLAIMED
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#fff", margin: "4px 0 2px" }}>
                {isClaimed ? "1,000 Welcome Points Active" : "Claim 1,000 Welcome Points"}
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.65)", margin: 0 }}>
                {isClaimed
                  ? `Your points balance is ${points.toLocaleString()} pts (~$${usdValue} USD value).`
                  : "All new players get 1,000 points automatically when registering identity."}
              </p>
            </div>
          </div>

          <div>
            {!isClaimed ? (
              <button
                onClick={handleClaimWelcome}
                disabled={claimRewardMutation.isPending}
                style={{
                  padding: "14px 28px",
                  borderRadius: "12px",
                  backgroundColor: "#EC9918",
                  border: "none",
                  color: "#111",
                  fontSize: "15px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 20px rgba(236, 153, 24, 0.4)",
                  transition: "transform 0.15s ease",
                }}
              >
                <Gift size={18} />
                {claimRewardMutation.isPending ? "Claiming…" : "Claim +1,000 Points"}
              </button>
            ) : (
              <div
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#10b981",
                  fontSize: "14px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Sparkles size={16} /> {points.toLocaleString()} Arena Points
              </div>
            )}
          </div>
        </section>

        {/* 2. Referral & 5% Winner Commission Hub */}
        <section style={{ marginBottom: "32px" }}>
          <ReferralCard />
        </section>

        {/* 3. Ways to Earn Breakdown */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Trophy size={24} color="#EC9918" style={{ marginBottom: "8px" }} />
            <strong style={{ color: "#fff", display: "block", fontSize: "15px", marginBottom: "4px" }}>
              90% Winner Prize Pot
            </strong>
            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", margin: 0, lineHeight: 1.4 }}>
              Win wagered matches in Ludo League and Connect NIM. The winner receives 90% of the entire table escrow pot.
            </p>
          </div>

          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Users size={24} color="#38bdf8" style={{ marginBottom: "8px" }} />
            <strong style={{ color: "#fff", display: "block", fontSize: "15px", marginBottom: "4px" }}>
              5% Lifetime Referral Cut
            </strong>
            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", margin: 0, lineHeight: 1.4 }}>
              Whenever any player you referred wins a match, you earn 5% of the pot automatically in NIM!
            </p>
          </div>

          <div
            style={{
              padding: "20px",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Gem size={24} color="#c084fc" style={{ marginBottom: "8px" }} />
            <strong style={{ color: "#fff", display: "block", fontSize: "15px", marginBottom: "4px" }}>
              Rankings &amp; Elo Tiers
            </strong>
            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", margin: 0, lineHeight: 1.4 }}>
              Climb to Gold, Diamond, and Grandmaster Elo tiers to unlock exclusive seasonal reward pools.
            </p>
          </div>
        </section>

        {/* Footer Trust */}
        <div className="trust-line" style={{ marginTop: "32px", justifyContent: "center" }}>
          <ShieldCheck size={16} />
          <span>All rewards and pot distributions are mathematically enforced and verified on Nimiq blockchain.</span>
        </div>
      </main>
    </div>
  );
}
