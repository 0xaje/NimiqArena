import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function JoinMatch() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const [joinCode, setJoinCode] = useState("");
  const join = trpc.match.joinByCode.useMutation();
  const user = authQuery.data;

  // Auto-fill from URL query param if present (?code=ABC123XYZ)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get("code") || params.get("joinCode");
      if (codeFromUrl) {
        const clean = codeFromUrl.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase();
        setJoinCode(clean);
        toast.info("Invite code detected from link", { description: `Code: ${clean}` });
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (!user) {
        toast.info("Signing in as Player 2 (Guest)…");
        const loginRes = await guestLogin.mutateAsync({
          name: "Player 2 (Guest)",
        });
        if (loginRes.token) {
          sessionStorage.setItem(
            "manus-cookie",
            `manus-session=${loginRes.token}`
          );
        }
        await utils.auth.me.invalidate();
      }
      const result = await join.mutateAsync({
        joinCode: joinCode.trim().toUpperCase(),
      });
      toast.success("Match joined", {
        description: `You joined as Player ${result.seat + 1}.`,
      });
      navigate(`/matches/${result.id}`);
    } catch (error) {
      toast.error("Join request rejected", {
        description:
          error instanceof Error
            ? error.message
            : "The challenge code is invalid or unavailable.",
      });
    }
  }

  return (
    <div className="detail-page">
      <header className="detail-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> Arena home
        </Link>
        <span className="detail-brand">NIMIQ ARENA / JOIN</span>
        <span className="detail-state">
          {user ? `PLAYING AS: ${user.name || "PLAYER 2"}` : "GUEST MODE"}
        </span>
      </header>
      <main className="detail-main join-main">
        <section className="room-hero">
          <span className="stamp orange">CHALLENGE FRIEND</span>
          <p className="eyebrow">JOIN A REAL MATCH</p>
          <h1>
            Enter the
            <br />
            <em>code.</em>
          </h1>
          <p className="detail-lede">
            Use the invite code shared by a friend. The server validates the
            code, checks the match capacity and expiry, then assigns your real
            player seat.
          </p>
        </section>
        <form className="join-card" onSubmit={submit}>
          <div className="join-icon">
            <KeyRound size={20} />
          </div>
          <label htmlFor="join-code" className="card-label">
            INVITE CODE
          </label>
          <input
            id="join-code"
            value={joinCode}
            onChange={event =>
              setJoinCode(
                event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 12)
              )
            }
            placeholder="AB12CD34"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={12}
          />
          <div
            style={{
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "10px",
              padding: "10px 14px",
              margin: "12px 0",
              fontSize: "11px",
              color: "#fbbf24",
              fontFamily: "IBM Plex Mono, monospace",
              textAlign: "left",
            }}
          >
            <strong style={{ display: "block", marginBottom: "4px" }}>
              MATCH DISTRIBUTION MODEL (100%)
            </strong>
            <span>🏆 Winner 90% · 👷 Builder 5% · 🌐 Ecosystem 3% · ❤️ Charity 2%</span>
          </div>
          <button
            className="primary-action"
            type="submit"
            disabled={join.isPending || joinCode.length < 6}
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              padding: "14px",
              fontWeight: 800,
            }}
          >
            {join.isPending ? "Validating table…" : "ENTER TABLE"}
          </button>
          <div className="trust-line">
            <ShieldCheck size={15} />
            <span>
              Authoritative server matchmaking. Real Testnet smart escrow.
            </span>
          </div>
        </form>
      </main>
      <footer className="detail-footer">
        <span>
          Invalid, full, expired, and unauthorized joins are rejected.
        </span>
        <Link href="/">Return to Arena</Link>
      </footer>
    </div>
  );
}
