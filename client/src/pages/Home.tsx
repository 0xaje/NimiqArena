/* Courtline Editorial reminder: ink navy, warm ivory, Arena Orange, offset matchday scorecards, explicit live/not-live boundaries. */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { createPaymentNonce, type PaymentPhase } from "@/lib/payment-state";
import { useEffect, useMemo, useRef, useState } from "react";
import { init } from "@nimiq/mini-app-sdk";
import {
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  Coins,
  Flag,
  LockKeyhole,
  Menu,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";

type ProviderState = "checking" | "ready" | "browser" | "error";
function formatAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 7)}…${address.slice(-5)}` : address;
}

function providerError(value: unknown) {
  if (typeof value !== "object" || value === null || !("error" in value)) return null;
  const error = (value as { error?: { message?: unknown } }).error;
  return error && typeof error.message === "string" ? error.message : "Provider request failed.";
}

export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const nimiqPromise = useRef<ReturnType<typeof init> | null>(null);
  const [providerState, setProviderState] = useState<ProviderState>("checking");
  const [providerMessage, setProviderMessage] = useState("Waiting for Nimiq Pay to initialize the provider…");
  const [address, setAddress] = useState<string | null>(null);
  const [language, setLanguage] = useState("en");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [paymentIntent, setPaymentIntent] = useState<{ id: string; recipient: string; valueLuna: number } | null>(null);
  const [clientNonce, setClientNonce] = useState(createPaymentNonce);
  const createIntent = trpc.payment.createIntent.useMutation();
  const markConfirmationPending = trpc.payment.markConfirmationPending.useMutation();
  const failIntent = trpc.payment.failIntent.useMutation();
  const submitTransaction = trpc.payment.submitTransaction.useMutation();

  useEffect(() => {
    setLanguage(window.nimiqPay?.language || navigator.language?.split("-")[0] || "en");
    const promise = init({ timeout: 10_000 });
    nimiqPromise.current = promise;
    promise
      .then(() => {
        setProviderState("ready");
        setProviderMessage("Nimiq Pay provider ready. Account access still requires your approval.");
      })
      .catch((error: unknown) => {
        setProviderState("browser");
        setProviderMessage(error instanceof Error ? error.message : "Open this Mini App inside Nimiq Pay.");
      });
  }, []);

  const providerLabel = useMemo(() => {
    if (providerState === "ready") return "PROVIDER READY";
    if (providerState === "checking") return "CHECKING PROVIDER";
    if (providerState === "error") return "PROVIDER ERROR";
    return "BROWSER PREVIEW";
  }, [providerState]);

  async function connectWallet() {
    if (!nimiqPromise.current || providerState !== "ready") {
      toast("Wallet connection is not available in this browser preview", {
        description: "Open the Mini App inside Nimiq Pay to request a real account approval.",
      });
      return;
    }
    try {
      const nimiq = await nimiqPromise.current;
      const result = await nimiq.listAccounts();
      const error = providerError(result);
      if (error) throw new Error(error);
      const accounts = result as string[];
      if (!accounts.length) throw new Error("No Nimiq account was returned.");
      setAddress(accounts[0]);
      toast.success("Nimiq account connected", { description: formatAddress(accounts[0]) });
    } catch (error) {
      setProviderState("error");
      setProviderMessage(error instanceof Error ? error.message : "The wallet request was not completed.");
      toast.error("Wallet request was not completed", { description: providerMessage });
    }
  }

  async function payEntry() {
    if (paymentPhase === "creating" || paymentPhase === "confirming") return;
    if (!nimiqPromise.current || providerState !== "ready") {
      toast("Nimiq Pay is required for payment", { description: "Open Arena inside Nimiq Pay to receive the native confirmation dialog." });
      return;
    }

    let intent: { id: string; recipient: string; valueLuna: number } | null = null;
    try {
      setPaymentPhase("creating");
      intent = await createIntent.mutateAsync({ clientNonce });
      setPaymentIntent(intent);
      await markConfirmationPending.mutateAsync({ id: intent.id });
      setPaymentPhase("confirming");

      const nimiq = await nimiqPromise.current;
      const result = await nimiq.sendBasicTransaction({ recipient: intent.recipient, value: intent.valueLuna });
      const error = providerError(result);
      if (error) throw new Error(error);
      const transactionHash = result as string;
      await submitTransaction.mutateAsync({ id: intent.id, transactionHash });
      setPaymentPhase("submitted");
      toast("Transaction submitted", { description: "Arena is waiting for server-side blockchain verification. No balance was credited yet." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The Nimiq payment request was not completed.";
      const isExpired = /expired/i.test(message);
      const code = /denied|reject|cancel/i.test(message) ? "permission_denied" : /invalid|malformed/i.test(message) ? "invalid_transaction" : "provider_error";
      if (intent) {
        try { await failIntent.mutateAsync({ id: intent.id, code }); } catch { /* preserve the original provider failure for the user */ }
      }
      setPaymentPhase(isExpired ? "expired" : code === "permission_denied" ? "rejected" : "failed");
      setClientNonce(createPaymentNonce());
      toast(isExpired ? "Payment intent expired" : code === "permission_denied" ? "Payment was rejected" : "Payment was not completed", { description: isExpired ? "A fresh payment intent will be created on your next attempt." : message });
    }
  }

  function unavailable(feature: string) {
    toast(`${feature} is not implemented yet`, {
      description: "This control is visible for product structure only; no simulated action was performed.",
    });
  }

  return (
    <div className="arena-app">
      <aside className={`arena-sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="sidebar-topline">
          <div className="brand-lockup" aria-label="Nimiq Arena">
            <img src="/manus-storage/nimiq-arena-mark_d1d871ea.png" alt="" className="brand-mark" />
            <div>
              <span className="brand-overline">NIMIQ</span>
              <span className="brand-name">ARENA</span>
            </div>
          </div>
          <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMobileMenu(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-rule" />
        <p className="sidebar-kicker">MATCHROOM / 001</p>
        <nav className="side-nav" aria-label="Primary navigation">
          <a className="side-nav-link active" href="#matchroom">Matchroom <span>01</span></a>
          <button className="side-nav-link" onClick={() => unavailable("Leaderboard")}>
            Leaderboard <span className="nav-status">NOT LIVE</span>
          </button>
          <button className="side-nav-link" onClick={() => unavailable("Rules library")}>
            Rules library <span>→</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-status">
            <span className={`status-dot ${providerState === "ready" ? "ready" : ""}`} />
            <div>
              <strong>{providerLabel}</strong>
              <span>{providerState === "ready" ? "Nimiq Pay detected" : "Awaiting host wallet"}</span>
            </div>
          </div>
          <button className="language-button" onClick={() => toast(`Nimiq Pay language: ${language.toUpperCase()}`)}>
            <span>Language</span><strong>{language.toUpperCase()}</strong>
          </button>
        </div>
      </aside>

      <main className="arena-main" id="matchroom">
        <header className="topbar">
          <button className="icon-button mobile-trigger" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>ARENA</span><ChevronRight size={13} /><strong>MATCHROOM</strong></div>
          <div className="top-actions">
            <button className="help-link" onClick={() => unavailable("Help center")}><CircleHelp size={16} /> How it works</button>
            <button className="wallet-button" onClick={connectWallet}><WalletCards size={16} /> {address ? formatAddress(address) : "Connect wallet"}</button>
          </div>
        </header>

        <section className="hero-grid">
          <div className="hero-copy">
            <div className="stamp-row"><span className="stamp orange">BUILD 01</span><span className="stamp">RULES FIRST</span></div>
            <p className="eyebrow">NIMIQ MINI APP / LUDO</p>
            <h1>Play the long game.<br /><em>Keep it real.</em></h1>
            <p className="hero-dek">Nimiq Arena is the matchroom for NIM-powered Ludo. Real players, real stakes, and a server-authoritative game engine — brought online in order.</p>
            <div className="hero-actions">
              <button className="primary-action" onClick={() => unavailable("Matchmaking")}>Find a table <ArrowUpRight size={17} /></button>
              <button className="text-action" onClick={() => document.getElementById("status")?.scrollIntoView({ behavior: "smooth" })}>See what’s live <ChevronRight size={16} /></button>
            </div>
            <div className="trust-line"><ShieldCheck size={15} /><span>No balances, players, or matches are shown until they come from a verified system.</span></div>
          </div>
          <div className="hero-art" aria-label="Editorial preview of an Arena Ludo table">
            <img src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1400&q=85" alt="A tactile game table in Arena editorial style" />
            <div className="hero-art-caption"><span>COURT STUDY 01</span><span>LOBBY / OFFLINE</span></div>
            <div className="hero-annotation"><Flag size={13} /> <span>THE TABLE IS BEING SET</span></div>
          </div>
        </section>

        <section className="status-strip" id="status">
          <div className="section-marker"><span className="marker-number">01</span><span>LIVE STATUS</span></div>
          <div className="status-card provider-card"><div className="status-icon"><Radio size={18} /></div><div><span className="card-label">NIMIQ PAY</span><h2>{providerState === "ready" ? "Provider is ready" : "Wallet host not connected"}</h2><p>{providerMessage}</p></div><span className={`state-chip ${providerState === "ready" ? "good" : "muted"}`}>{providerLabel}</span></div>
          <div className="status-card payment-card"><div className="status-icon orange-icon"><Coins size={18} /></div><div><span className="card-label">NIM ENTRY</span><h2>{paymentPhase === "submitted" ? "Awaiting verification" : paymentPhase === "confirming" ? "Confirm in Nimiq Pay" : paymentPhase === "rejected" ? "Payment rejected" : paymentPhase === "failed" ? "Payment failed" : paymentPhase === "expired" ? "Intent expired" : "Pay the entry"}</h2><p>{paymentPhase === "submitted" ? "A transaction hash was received. Arena has not credited anything until the server verifies it." : "The amount and recipient come from a server-created intent. Nimiq Pay asks you to approve the transaction."}</p><button className="pay-entry-button" onClick={payEntry} disabled={paymentPhase === "creating" || paymentPhase === "confirming" || paymentPhase === "submitted"}>{paymentPhase === "creating" ? "Creating intent…" : paymentPhase === "confirming" ? "Waiting for approval…" : paymentPhase === "submitted" ? "Verification pending" : "Pay with Nimiq Pay"}</button></div><span className={`state-chip ${paymentPhase === "submitted" ? "good" : "muted"}`}>{paymentPhase === "submitted" ? "SUBMITTED" : paymentPhase === "confirming" ? "CONFIRMING" : paymentPhase === "expired" ? "EXPIRED" : "NOT SETTLED"}</span></div>
          <div className="status-card"><div className="status-icon"><Trophy size={18} /></div><div><span className="card-label">MATCHMAKING</span><h2>No tables open</h2><p>Server-authoritative multiplayer is not connected in this build.</p></div><span className="state-chip muted">NOT LIVE</span></div>
        </section>

        <section className="playbook-section">
          <div className="section-heading"><div><p className="eyebrow">MATCHDAY NOTES</p><h2>Built for the table,<br /><em>not the trailer.</em></h2></div><p className="section-note">The first release is deliberately narrow: establish the Mini App connection, prove the rules, then bring money and multiplayer into the same verified loop.</p></div>
          <div className="playbook-layout">
            <div className="board-card"><div className="board-header"><span className="stamp orange">BOARD PREVIEW</span><span className="board-meta">STATIC ARTWORK / NOT PLAYABLE</span></div><div className="board-visual"><img src="https://images.unsplash.com/photo-1605870445919-838d190e8e1b?auto=format&fit=crop&w=1200&q=85" alt="Abstract editorial game field preview" /><div className="board-overlay"><span>LOBBY</span><strong>Awaiting<br />real players</strong></div><span className="token-art token-css" aria-hidden="true" /></div><div className="board-footer"><span>01 / 04</span><span>COURTLINE STUDY</span><button onClick={() => unavailable("Playable board")}>Open board <ArrowUpRight size={14} /></button></div></div>
            <div className="principles-list">
              <article className="principle"><span className="principle-no">A / 01</span><div><h3>Authoritative by design</h3><p>Moves will be validated on the server, not trusted from a browser event. The current UI exposes the contract without pretending the engine is online.</p></div></article>
              <article className="principle"><span className="principle-no">A / 02</span><div><h3>Money only after consent</h3><p>NIM payments require a real Nimiq Pay confirmation flow. No balance, payment, or payout is fabricated in this preview.</p></div></article>
              <article className="principle"><span className="principle-no">A / 03</span><div><h3>Every state has a receipt</h3><p>Match results, ratings, and leaderboards will be backed by verifiable records before they appear as product truth.</p></div></article>
            </div>
          </div>
        </section>

        <footer className="arena-footer"><div className="footer-mark"><img src="/manus-storage/nimiq-arena-mark_d1d871ea.png" alt="" className="footer-brand-mark" /><Sparkles size={15} /><span>THE HONEST MATCHROOM</span></div><span>Nimiq Arena / Product foundation / 2026</span><button onClick={() => unavailable("Terms and safeguards")}><LockKeyhole size={14} /> Safeguards <ArrowUpRight size={13} /></button></footer>
      </main>
    </div>
  );
}
