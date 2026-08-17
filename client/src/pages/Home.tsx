import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { createPaymentNonce, type PaymentPhase } from "@/lib/payment-state";
import { init } from "@nimiq/mini-app-sdk";
import { ArrowUpRight, ChevronRight, CircleHelp, Coins, Gamepad2, Menu, Radio, Search, ShieldCheck, Sparkles, Trophy, WalletCards, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type ProviderState = "checking" | "ready" | "browser" | "error";

type GameCard = {
  title: string;
  genre: string;
  status: "FEATURED" | "COMING SOON" | "CONCEPT";
  image: string;
  accent: string;
  description: string;
};

const games: GameCard[] = [
  { title: "Ludo League", genre: "STRATEGY / SOCIAL", status: "FEATURED", image: "https://images.unsplash.com/photo-1605870445919-838d190e8e1b?auto=format&fit=crop&w=900&q=85", accent: "orange", description: "The first Arena table. Server-authoritative multiplayer is being connected in order." },
  { title: "Arena Blitz", genre: "ARCADE / DUEL", status: "COMING SOON", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=85", accent: "blue", description: "A fast round-based format for quick NIM-powered matches." },
  { title: "Hex Relay", genre: "TACTICS / TURN-BASED", status: "CONCEPT", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=85", accent: "green", description: "A planning game on a changing board. Rules are not implemented yet." },
];

function formatAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 7)}…${address.slice(-5)}` : address;
}

function providerError(value: unknown) {
  if (typeof value !== "object" || value === null || !("error" in value)) return null;
  const error = (value as { error?: { message?: unknown } }).error;
  return error && typeof error.message === "string" ? error.message : "Provider request failed.";
}

export default function Home() {
  useAuth();
  const nimiqPromise = useRef<ReturnType<typeof init> | null>(null);
  const [providerState, setProviderState] = useState<ProviderState>("checking");
  const [providerMessage, setProviderMessage] = useState("Waiting for Nimiq Pay to initialize the provider…");
  const [address, setAddress] = useState<string | null>(null);
  const [language, setLanguage] = useState("en");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [clientNonce, setClientNonce] = useState(createPaymentNonce);
  const createIntent = trpc.payment.createIntent.useMutation();
  const markConfirmationPending = trpc.payment.markConfirmationPending.useMutation();
  const failIntent = trpc.payment.failIntent.useMutation();
  const submitTransaction = trpc.payment.submitTransaction.useMutation();

  useEffect(() => {
    setLanguage(window.nimiqPay?.language || navigator.language?.split("-")[0] || "en");
    const promise = init({ timeout: 10_000 });
    nimiqPromise.current = promise;
    promise.then(() => {
      setProviderState("ready");
      setProviderMessage("Nimiq Pay provider ready. Account access still requires your approval.");
    }).catch((error: unknown) => {
      setProviderState("browser");
      setProviderMessage(error instanceof Error ? error.message : "Open this Mini App inside Nimiq Pay.");
    });
  }, []);

  const providerLabel = useMemo(() => providerState === "ready" ? "PROVIDER READY" : providerState === "checking" ? "CHECKING PROVIDER" : providerState === "error" ? "PROVIDER ERROR" : "BROWSER PREVIEW", [providerState]);

  async function connectWallet() {
    if (!nimiqPromise.current || providerState !== "ready") {
      toast("Wallet connection is not available in this preview", { description: "Open the Mini App inside Nimiq Pay to request a real account approval." });
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
      toast.error("Wallet request was not completed");
    }
  }

  async function payEntry() {
    if (paymentPhase === "creating" || paymentPhase === "confirming" || paymentPhase === "submitted") return;
    if (!nimiqPromise.current || providerState !== "ready") {
      toast("Nimiq Pay is required for payment", { description: "Open Arena inside Nimiq Pay to receive the native confirmation dialog." });
      return;
    }
    let intent: { id: string; recipient: string; valueLuna: number } | null = null;
    try {
      setPaymentPhase("creating");
      intent = await createIntent.mutateAsync({ clientNonce });
      await markConfirmationPending.mutateAsync({ id: intent.id });
      setPaymentPhase("confirming");
      const nimiq = await nimiqPromise.current;
      const result = await nimiq.sendBasicTransaction({ recipient: intent.recipient, value: intent.valueLuna });
      const error = providerError(result);
      if (error) throw new Error(error);
      await submitTransaction.mutateAsync({ id: intent.id, transactionHash: result as string });
      setPaymentPhase("submitted");
      toast("Transaction submitted", { description: "Arena is waiting for server-side blockchain verification. No balance was credited yet." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The Nimiq payment request was not completed.";
      const isExpired = /expired/i.test(message);
      const code = /denied|reject|cancel/i.test(message) ? "permission_denied" : /invalid|malformed/i.test(message) ? "invalid_transaction" : "provider_error";
      if (intent) {
        try { await failIntent.mutateAsync({ id: intent.id, code }); } catch { /* preserve original provider failure */ }
      }
      setPaymentPhase(isExpired ? "expired" : code === "permission_denied" ? "rejected" : "failed");
      setClientNonce(createPaymentNonce());
      toast(isExpired ? "Payment intent expired" : code === "permission_denied" ? "Payment was rejected" : "Payment was not completed", { description: isExpired ? "A fresh intent will be created on your next attempt." : message });
    }
  }

  function unavailable(feature: string) {
    toast(`${feature} is not implemented yet`, { description: "This control is visible for platform structure only; no simulated action was performed." });
  }

  return (
    <div className="arena-app">
      <aside className={`arena-sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="sidebar-topline">
          <div className="brand-lockup" aria-label="Nimiq Arena">
            <img src="/manus-storage/nimiq-arena-mark_d1d871ea.png" alt="" className="brand-mark" />
            <div><span className="brand-overline">NIMIQ</span><span className="brand-name">ARENA</span></div>
          </div>
          <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMobileMenu(false)}><X size={18} /></button>
        </div>
        <div className="sidebar-rule" />
        <p className="sidebar-kicker">THE GAME ROOM / 001</p>
        <nav className="side-nav" aria-label="Primary navigation">
          <a className="side-nav-link active" href="#featured">Discover <span>01</span></a>
          <a className="side-nav-link" href="#games">Game library <span>03</span></a>
          <button className="side-nav-link" onClick={() => unavailable("Live rooms")}>Live rooms <span className="nav-status">NOT LIVE</span></button>
          <button className="side-nav-link" onClick={() => unavailable("Leaderboard")}>Leaderboard <span className="nav-status">NOT LIVE</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-status"><span className={`status-dot ${providerState === "ready" ? "ready" : ""}`} /><div><strong>{providerLabel}</strong><span>{providerState === "ready" ? "Nimiq Pay detected" : "Awaiting host wallet"}</span></div></div>
          <button className="language-button" onClick={() => toast(`Nimiq Pay language: ${language.toUpperCase()}`)}><span>Language</span><strong>{language.toUpperCase()}</strong></button>
        </div>
      </aside>

      <main className="arena-main">
        <header className="topbar">
          <button className="icon-button mobile-trigger" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={20} /></button>
          <div className="topbar-brand"><span className="topbar-kicker">NIMIQ ARENA</span><span className="topbar-title">A place to play, meet, and compete.</span></div>
          <div className="top-actions"><button className="search-button" onClick={() => unavailable("Game search")}><Search size={16} /> Search games</button><button className="help-link" onClick={() => unavailable("Help center")}><CircleHelp size={16} /> How it works</button><button className="wallet-button" onClick={connectWallet}><WalletCards size={16} /> {address ? formatAddress(address) : "Connect wallet"}</button></div>
        </header>

        <section className="platform-intro" id="featured">
          <div className="intro-copy"><div className="stamp-row"><span className="stamp orange">SEASON 01</span><span className="stamp">OPENING TABLES</span></div><p className="eyebrow">A NIM-POWERED GAME ROOM</p><h1>Find your next<br /><em>favorite game.</em></h1><p className="hero-dek">Nimiq Arena is a growing home for games with real ownership, honest competition, and room for more than one kind of player.</p><div className="hero-actions"><a className="primary-action" href="#games">Browse the games <ArrowUpRight size={17} /></a><button className="text-action" onClick={() => document.getElementById("status")?.scrollIntoView({ behavior: "smooth" })}>Check live status <ChevronRight size={16} /></button></div><div className="trust-line"><ShieldCheck size={15} /><span>Live players, balances, and match results appear only when verified systems are connected.</span></div></div>
          <div className="feature-stage"><div className="feature-art"><img src={games[0].image} alt="Ludo table preview" /><div className="feature-wash" /><div className="feature-copy"><span className="card-label">01 / FEATURED GAME</span><h2>Ludo<br /><em>League</em></h2><p>Strategy, luck, and the long way around.</p><button className="stage-button" onClick={() => unavailable("Ludo matchmaking")}><Gamepad2 size={15} /> View game</button></div><span className="feature-chip">FEATURED / NOT LIVE</span></div><div className="feature-footer"><span><Zap size={13} /> FIRST ON THE TABLE</span><span>STRATEGY / SOCIAL</span></div></div>
        </section>

        <section className="section-block" id="games"><div className="section-topline"><div><p className="eyebrow">THE ARENA INDEX</p><h2>Pick a room.<br /><em>Stay for the games.</em></h2></div><button className="browse-link" onClick={() => unavailable("Full game library")}><span>View all games</span><ArrowUpRight size={15} /></button></div><div className="game-grid">{games.map((game, index) => <article className={`game-card ${game.status === "FEATURED" ? "featured-card" : ""}`} key={game.title}><div className={`game-card-art ${game.accent}`}><img src={game.image} alt="" /><div className="game-card-shade" /><span className="game-status">{game.status}</span><span className="game-index">0{index + 1}</span></div><div className="game-card-body"><div><span className="card-label">{game.genre}</span><h3>{game.title}</h3></div><button className="round-arrow" onClick={() => game.status === "FEATURED" ? unavailable("Ludo matchmaking") : unavailable(game.title)} aria-label={`Open ${game.title}`}><ArrowUpRight size={15} /></button><p>{game.description}</p></div></article>)}</div></section>

        <section className="arena-rails"><div className="rail-card rail-dark"><span className="card-label">THE POINT OF THE ARENA</span><h3>Play something<br /><em>worth coming back to.</em></h3><p>Games are the beginning. Community, progression, and fair competition are the long game.</p><button className="rail-link" onClick={() => unavailable("Arena community")}><Sparkles size={14} /> Explore the vision</button></div><div className="rail-card"><span className="card-label">NIMIQ PAY / LIVE STATUS</span><div className="rail-status"><span className={`status-dot ${providerState === "ready" ? "ready" : ""}`} /><strong>{providerLabel}</strong></div><h3>{providerState === "ready" ? "Your wallet host is ready." : "The host wallet is not connected."}</h3><p>{providerMessage}</p><button className="rail-link" onClick={connectWallet}><WalletCards size={14} /> {address ? "Wallet connected" : "Connect a wallet"}</button></div></section>

        <section className="status-strip" id="status"><div className="section-marker"><span className="marker-number">03</span><span>TRUTH PANEL</span></div><div className="status-card"><div className="status-icon"><Radio size={18} /></div><div><span className="card-label">NIMIQ PAY</span><h2>{providerState === "ready" ? "Provider is ready" : "Wallet host not connected"}</h2><p>{providerMessage}</p></div><span className={`state-chip ${providerState === "ready" ? "good" : "muted"}`}>{providerLabel}</span></div><div className="status-card payment-card"><div className="status-icon orange-icon"><Coins size={18} /></div><div><span className="card-label">NIM ENTRY</span><h2>{paymentPhase === "submitted" ? "Awaiting verification" : paymentPhase === "confirming" ? "Confirm in Nimiq Pay" : paymentPhase === "rejected" ? "Payment rejected" : paymentPhase === "failed" ? "Payment failed" : paymentPhase === "expired" ? "Intent expired" : "Pay the entry"}</h2><p>{paymentPhase === "submitted" ? "Hash received. Arena has not credited anything until the server verifies it." : "The amount and recipient come from a server-created intent."}</p><button className="pay-entry-button" onClick={payEntry} disabled={paymentPhase === "creating" || paymentPhase === "confirming" || paymentPhase === "submitted"}>{paymentPhase === "creating" ? "Creating intent…" : paymentPhase === "confirming" ? "Waiting for approval…" : paymentPhase === "submitted" ? "Verification pending" : "Pay with Nimiq Pay"}</button></div><span className={`state-chip ${paymentPhase === "submitted" ? "good" : "muted"}`}>{paymentPhase === "submitted" ? "SUBMITTED" : paymentPhase === "confirming" ? "CONFIRMING" : paymentPhase === "expired" ? "EXPIRED" : "NOT SETTLED"}</span></div><div className="status-card"><div className="status-icon"><Trophy size={18} /></div><div><span className="card-label">MULTIPLAYER</span><h2>No rooms open</h2><p>Real matchmaking and online players are not connected in this build.</p></div><span className="state-chip muted">NOT LIVE</span></div></section>

        <footer className="arena-footer"><div className="footer-mark"><img src="/manus-storage/nimiq-arena-mark_d1d871ea.png" alt="" className="footer-brand-mark" /><Sparkles size={15} /><span>THE GAME ROOM IS OPENING</span></div><span>Nimiq Arena / Multi-game platform foundation / 2026</span><button onClick={() => unavailable("Terms and safeguards")}><ShieldCheck size={14} /> Safeguards <ArrowUpRight size={13} /></button></footer>
      </main>
    </div>
  );
}
