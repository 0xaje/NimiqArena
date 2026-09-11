import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  Gem,
  Gift,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { ArenaPatronVault } from "@/components/staking/ArenaPatronVault";
import { useNimiqPrice } from "@/lib/nimiq-price";

export default function Earn() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;
  const { nimToUsd, formatUsd } = useNimiqPrice();

  const isClaimed = Boolean((user as any)?.welcomeClaimed);
  const points = (user as any)?.points ?? (isClaimed ? 1000 : 0);
  const usdValue = ((points / 100) * 0.1).toFixed(2);

  const claimRewardMutation = trpc.auth.claimWelcomeReward.useMutation();

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
        <span className="detail-brand">NIMIQ ARENA / REWARDS HUB</span>
        <span className="detail-state">
          {user ? `SIGNED IN: ${user.name || "PLAYER"}` : "GUEST MODE"}
        </span>
      </header>

      <main className="detail-main" style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "48px" }}>
        {/* Mobile-Optimized Hero Banner */}
        <section className="room-hero" style={{ textAlign: "center", marginBottom: "24px" }}>
          <div className="stamp-row" style={{ justifyContent: "center", marginBottom: "8px" }}>
            <span className="stamp orange">REWARDS &amp; EARNINGS</span>
            <span className="stamp green">SEASON 1</span>
          </div>
          <h1 style={{ fontSize: "clamp(26px, 6vw, 36px)", margin: "8px 0 6px" }}>
            Play, Refer &amp; <em style={{ color: "#EC9918" }}>Earn.</em>
          </h1>
          <p className="detail-lede" style={{ maxWidth: "520px", margin: "0 auto 16px", fontSize: "13px" }}>
            Claim your 1,000 Welcome Points, earn 2% on all referred match wins, and stake in the Patron Vault for revenue dividends.
          </p>

          {/* Quick Points Capsule */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(236, 153, 24, 0.12)",
              border: "1px solid rgba(236, 153, 24, 0.35)",
              borderRadius: "20px",
              padding: "6px 14px",
              fontSize: "12px",
              fontFamily: "'IBM Plex Mono', monospace",
              color: "#fbbf24",
              fontWeight: 700,
            }}
          >
            <Sparkles size={14} color="#EC9918" />
            <span>Your Balance: {points.toLocaleString()} Arena Points (~${usdValue} USD)</span>
          </div>
        </section>

        {/* 1. Mobile-Optimized Welcome Bonus Card */}
        <section
          style={{
            padding: "18px 20px",
            borderRadius: "16px",
            backgroundColor: "#16191f",
            border: isClaimed ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(236, 153, 24, 0.5)",
            boxShadow: isClaimed
              ? "0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.1)"
              : "0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(236, 153, 24, 0.15)",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: isClaimed ? "0" : "14px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: isClaimed ? "rgba(16, 185, 129, 0.15)" : "rgba(236, 153, 24, 0.15)",
                border: isClaimed ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(236, 153, 24, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Gift size={24} color={isClaimed ? "#10b981" : "#EC9918"} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    color: isClaimed ? "#10b981" : "#EC9918",
                  }}
                >
                  WELCOME REWARD
                </span>
                {isClaimed && (
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      fontWeight: 700,
                    }}
                  >
                    ✓ CLAIMED
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#fff", margin: "3px 0 2px" }}>
                {isClaimed ? "1,000 Welcome Points Active" : "Claim 1,000 Welcome Points"}
              </h3>
              <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.65)", margin: 0 }}>
                {isClaimed
                  ? "Points active! Use points for beta tournaments and exclusive features."
                  : "All players get 1,000 points automatically when registering."}
              </p>
            </div>
          </div>

          {!isClaimed && (
            <button
              onClick={handleClaimWelcome}
              disabled={claimRewardMutation.isPending}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                backgroundColor: "#EC9918",
                border: "none",
                color: "#111",
                fontSize: "14px",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 16px rgba(236, 153, 24, 0.4)",
              }}
            >
              <Gift size={16} />
              {claimRewardMutation.isPending ? "Claiming…" : "Claim +1,000 Points Now"}
            </button>
          )}
        </section>

        {/* 2. Arena Patron Vault & Staking Hub */}
        <section id="vault" style={{ marginBottom: "24px" }}>
          <ArenaPatronVault />
        </section>

        {/* 3. Referral & 2% Winner Commission Hub */}
        <section style={{ marginBottom: "24px" }}>
          <ReferralCard />
        </section>

        {/* 4. Ways to Earn Mobile Grid (2x2) */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "12px",
            marginTop: "12px",
          }}
        >
          <div
            style={{
              padding: "16px",
              borderRadius: "14px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <Trophy size={22} color="#EC9918" />
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#EC9918", background: "rgba(236, 153, 24, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                90% POT
              </span>
            </div>
            <strong style={{ color: "#fff", display: "block", fontSize: "14px", marginBottom: "4px" }}>
              Winner Prize Pot
            </strong>
            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", margin: 0, lineHeight: 1.4 }}>
              Win matches in Ludo League and Connect NIM. The winner receives 90% of the entire table escrow pot.
            </p>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "14px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <Coins size={22} color="#fbbf24" />
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#4ade80", background: "rgba(74, 222, 128, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                6.0% - 8.0% APY
              </span>
            </div>
            <strong style={{ color: "#fff", display: "block", fontSize: "14px", marginBottom: "4px" }}>
              Patron Staking Yield
            </strong>
            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", margin: 0, lineHeight: 1.4 }}>
              Stake NIM in the Patron Vault to earn native Nimiq PoS rewards + monthly match fee dividend share.
            </p>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "14px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <Users size={22} color="#38bdf8" />
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                2% LIFETIME
              </span>
            </div>
            <strong style={{ color: "#fff", display: "block", fontSize: "14px", marginBottom: "4px" }}>
              Referral Commissions
            </strong>
            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", margin: 0, lineHeight: 1.4 }}>
              Whenever any player you referred wins a match, you earn 2% of the pot automatically in NIM!
            </p>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "14px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <Gem size={22} color="#c084fc" />
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#c084fc", background: "rgba(192, 132, 252, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                SEASON POOLS
              </span>
            </div>
            <strong style={{ color: "#fff", display: "block", fontSize: "14px", marginBottom: "4px" }}>
              Rankings &amp; Elo Tiers
            </strong>
            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", margin: 0, lineHeight: 1.4 }}>
              Climb to Gold, Diamond, and Grandmaster Elo tiers to unlock seasonal rewards and glory.
            </p>
          </div>
        </section>

        {/* Footer Trust */}
        <div className="trust-line" style={{ marginTop: "28px", justifyContent: "center" }}>
          <ShieldCheck size={16} />
          <span>All rewards and pot distributions are mathematically enforced and verified on Nimiq blockchain.</span>
        </div>
      </main>
    </div>
  );
}
