import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { createPaymentNonce, type PaymentPhase } from "@/lib/payment-state";
import {
  initializeNimiqMiniApp,
  getNimiqProvider,
  getHostLanguage,
  runNimiqThreeRequests,
} from "@/lib/nimiq-miniapp";
import {
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  Coins,
  Gamepad2,
  Menu,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trophy,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { QuickMatchModal } from "@/components/game/QuickMatchModal";
import { LudoEntryFlowModal } from "@/components/game/LudoEntryFlowModal";
import { TestnetFaucetModal } from "@/components/game/TestnetFaucetModal";
import { MiniAppDevModal } from "@/components/game/MiniAppDevModal";
import { WalletConnectModal } from "@/components/game/WalletConnectModal";
import { NimiqArenaLogo } from "@/components/brand/NimiqArenaLogo";
import { IdentityRegistrationModal } from "@/components/profile/IdentityRegistrationModal";
import { ReferralCard } from "@/components/referral/ReferralCard";
import {
  restoreSavedWallet,
  getWalletConnectionMode,
  getLiveTestnetStatus,
  isRunningInNimiqPay,
  sendNimiqPayment,
  fetchNimiqBalance,
  type WalletConnectionMode,
} from "@/lib/nimiq-wallet";

type ProviderState = "checking" | "ready" | "browser" | "error";

type GameCard = {
  title: string;
  genre: string;
  status: "FEATURED" | "COMING SOON" | "CONCEPT" | "UNAVAILABLE";
  image: string;
  accent: string;
  description: string;
};

function formatAddress(address: string) {
  return address.length > 14
    ? `${address.slice(0, 7)}…${address.slice(-5)}`
    : address;
}

function providerError(value: unknown) {
  if (typeof value !== "object" || value === null || !("error" in value))
    return null;
  const error = (value as { error?: { message?: unknown } }).error;
  return error && typeof error.message === "string"
    ? error.message
    : "Provider request failed.";
}

const LUDO_SLUG_INPUT = { slug: "ludo-league" } as const;
const CONNECT4_SLUG_INPUT = { slug: "connect-four" } as const;
const LEADERBOARD_INPUT = { gameSlug: "ludo-league" } as const;
const STATS_INPUT = { gameSlug: "ludo-league" } as const;

export default function Home() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const user = authQuery.data;
  const ludoQuery = trpc.game.getBySlug.useQuery(LUDO_SLUG_INPUT);
  const connect4Query = trpc.game.getBySlug.useQuery(CONNECT4_SLUG_INPUT);
  const gameCards: GameCard[] = [
    {
      title: ludoQuery.data?.name ?? "Ludo League",
      genre: "STRATEGY / SOCIAL",
      status: ludoQuery.data ? "FEATURED" : "UNAVAILABLE",
      image:
        "https://images.unsplash.com/photo-1605870445919-838d190e8e1b?auto=format&fit=crop&w=900&q=85",
      accent: "orange",
      description:
        ludoQuery.data?.description ??
        "The real Ludo game record is unavailable right now.",
    },
    {
      title: connect4Query.data?.name ?? "Connect NIM",
      genre: "TACTICAL / STRATEGY",
      status: connect4Query.data ? "FEATURED" : "UNAVAILABLE",
      image:
        "https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&w=900&q=85",
      accent: "blue",
      description:
        connect4Query.data?.description ??
        "Vertical 7x6 tactical strategy game. Drop discs to connect 4 in a row horizontally, vertically, or diagonally.",
    },
  ];
  const [providerState, setProviderState] = useState<ProviderState>(() =>
    isRunningInNimiqPay() ? "checking" : "browser"
  );
  const [consensus, setConsensus] = useState<boolean | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [connectionMode, setConnectionMode] = useState<WalletConnectionMode>(() =>
    getWalletConnectionMode()
  );
  const [address, setAddress] = useState<string | null>(() =>
    restoreSavedWallet()
  );
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!address) {
      setWalletBalance(null);
      return;
    }
    fetchNimiqBalance(address)
      .then(bal => setWalletBalance(bal))
      .catch(() => {});
  }, [address]);

  const [language, setLanguage] = useState(() =>
    getHostLanguage() || (typeof navigator !== "undefined" ? navigator.language?.split("-")[0] : "en") || "en"
  );
  const [providerMessage, setProviderMessage] = useState(() => {
    if (isRunningInNimiqPay()) return "Checking Nimiq wallet provider…";
    const saved = restoreSavedWallet();
    return saved
      ? "Connected via Official Nimiq Hub / Web Wallet."
      : "Web Browser: Connect via Official Nimiq Hub.";
  });
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isQuickMatchOpen, setIsQuickMatchOpen] = useState(false);
  const [isLudoFlowOpen, setIsLudoFlowOpen] = useState(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [clientNonce, setClientNonce] = useState(createPaymentNonce);
  const createIntent = trpc.payment.createIntent.useMutation();
  const markConfirmationPending =
    trpc.payment.markConfirmationPending.useMutation();
  const failIntent = trpc.payment.failIntent.useMutation();
  const submitTransaction = trpc.payment.submitTransaction.useMutation();
  const verifyPayment = trpc.payment.verify.useMutation();
  const createSolo = trpc.match.createSoloMatch.useMutation();
  const loginWithNimiq = trpc.auth.loginWithNimiq.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  const seasonQuery = trpc.season.getActive.useQuery();
  const leaderboardQuery = trpc.leaderboard.getTop.useQuery(LEADERBOARD_INPUT);
  const statsQuery = trpc.auth.stats.useQuery(STATS_INPUT, {
    enabled: Boolean(user),
  });

  async function handleStartSoloPractice() {
    try {
      if (!user) {
        toast.info("Signing in as Player 1…");
        const loginRes = await guestLogin.mutateAsync({
          name: "Player 1 (Solo)",
        });
        if (loginRes.token) {
          sessionStorage.setItem(
            "manus-cookie",
            `manus-session=${loginRes.token}`
          );
        }
        await utils.auth.me.invalidate();
      }
      toast.info("Launching Practice Table vs Arena Bot…");
      const match = await createSolo.mutateAsync({ gameSlug: "ludo-league" });
      window.location.href = `/matches/${match.id}`;
    } catch (err) {
      toast.error("Failed to launch solo practice", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  }

  async function switchPlayer(name: string) {
    try {
      // Switching player means becoming someone else, not renaming yourself,
      // so ask the server for a fresh identity rather than reusing this one.
      const res = await guestLogin.mutateAsync({ name, newIdentity: true });
      if (res.token) {
        sessionStorage.setItem("manus-cookie", `manus-session=${res.token}`);
      }
      await utils.auth.me.invalidate();
      await utils.auth.stats.invalidate();
      await utils.leaderboard.getTop.invalidate();
      toast.success(`Signed in as ${name}`);
    } catch (e) {
      toast.error("Failed to switch player");
    }
  }

  useEffect(() => {
    // 1. Query live on-chain Testnet status from public RPC
    getLiveTestnetStatus().then(status => {
      setConsensus(status.consensus);
      setBlockNumber(status.blockNumber);
    });

    // 2. Connect to Nimiq Pay if running inside Mini App
    if (isRunningInNimiqPay()) {
      initializeNimiqMiniApp()
        .then(({ provider, isInsideNimiqPay: inApp, error }) => {
          if (inApp && provider) {
            setProviderState("ready");
            setProviderMessage("Connected to native Nimiq Pay mobile host.");
            runNimiqThreeRequests(provider)
              .then(res => {
                if (res.accounts.length > 0) {
                  setAddress(res.accounts[0]);
                  setConnectionMode("mini-app");
                }
              })
              .catch(() => {});
          } else {
            setProviderState("browser");
            setProviderMessage(error || "Nimiq Pay host not detected.");
          }
        })
        .catch(() => {
          setProviderState("browser");
        });
    }
  }, []);

  const providerLabel = useMemo(() => {
    if (address) {
      return connectionMode === "mini-app"
        ? "NIMIQ PAY"
        : connectionMode === "hub"
          ? "NIMIQ HUB"
          : "WALLET CONNECTED";
    }
    return isRunningInNimiqPay()
      ? "NIMIQ PAY"
      : "BROWSER (WEB WALLET)";
  }, [providerState, address, connectionMode]);

  async function connectWallet() {
    setIsWalletModalOpen(true);
  }

  async function payEntry() {
    if (
      paymentPhase === "creating" ||
      paymentPhase === "confirming" ||
      paymentPhase === "submitted" ||
      paymentPhase === "verifying"
    )
      return;
    if (!address) {
      setIsWalletModalOpen(true);
      toast("Connect your Nimiq wallet first", {
        description: "Select Nimiq Hub or enter your address.",
      });
      return;
    }
    let intent: { id: string; recipient: string; valueLuna: number } | null =
      null;
    try {
      setPaymentPhase("creating");
      intent = await createIntent.mutateAsync({ clientNonce });
      await markConfirmationPending.mutateAsync({ id: intent.id });
      setPaymentPhase("confirming");
      const txHash = await sendNimiqPayment({
        recipient: intent.recipient,
        valueLuna: intent.valueLuna,
        // Binds the transfer to this intent; the server rejects it otherwise.
        data: intent.id,
      });
      await submitTransaction.mutateAsync({
        id: intent.id,
        transactionHash: txHash,
      });
      setPaymentPhase("verifying");
      toast("Transaction submitted", {
        description:
          "Authoritative server verifier is checking the Nimiq blockchain...",
      });

      const verifyResult = await verifyPayment.mutateAsync({ id: intent.id });
      if (verifyResult.success) {
        setPaymentPhase("verified");
        toast.success("Payment Verified On-Chain!", {
          description: `Transaction confirmed on Nimiq network. Block ${verifyResult.intent.blockNumber ?? "latest"}.`,
        });
      } else {
        setPaymentPhase(verifyResult.intent.status as PaymentPhase);
        toast.error(`Verification Rejected: ${verifyResult.intent.status}`, {
          description:
            verifyResult.errorMessage || "Server rejected transaction.",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The Nimiq payment request was not completed.";
      const isExpired = /expired/i.test(message);
      const code = /denied|reject|cancel/i.test(message)
        ? "permission_denied"
        : /invalid|malformed/i.test(message)
          ? "invalid_transaction"
          : "provider_error";
      if (intent) {
        try {
          await failIntent.mutateAsync({ id: intent.id, code });
        } catch {
          /* preserve original provider failure */
        }
      }
      setPaymentPhase(
        isExpired
          ? "expired"
          : code === "permission_denied"
            ? "rejected"
            : "failed"
      );
      setClientNonce(createPaymentNonce());
      toast(
        isExpired
          ? "Payment intent expired"
          : code === "permission_denied"
            ? "Payment was rejected"
            : "Payment was not completed",
        {
          description: isExpired
            ? "A fresh intent will be created on your next attempt."
            : message,
        }
      );
    }
  }

  function unavailable(feature: string) {
    toast(`${feature} is not implemented yet`, {
      description:
        "This control is visible for platform structure only; no simulated action was performed.",
    });
  }

  return (
    <div className="arena-app">
      <QuickMatchModal
        isOpen={isQuickMatchOpen}
        onClose={() => setIsQuickMatchOpen(false)}
        gameSlug="ludo-league"
      />
      <LudoEntryFlowModal
        isOpen={isLudoFlowOpen}
        onClose={() => setIsLudoFlowOpen(false)}
      />
      <TestnetFaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
        userAddress={address}
      />
      <MiniAppDevModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
      />
      <IdentityRegistrationModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        currentName={user?.name}
      />
      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        connectedAddress={address}
        connectionMode={connectionMode}
        onConnected={async (addr, mode) => {
          setAddress(addr);
          setConnectionMode(mode);
          fetchNimiqBalance(addr).then(bal => setWalletBalance(bal)).catch(() => {});
          try {
            const challengeRes = await utils.client.auth.requestChallenge.query();
            await loginWithNimiq.mutateAsync({
              address: addr,
              challenge: challengeRes.challenge,
            });
            void utils.auth.me.invalidate();
            toast.success("Signed in with Nimiq Wallet", {
              description: `Session bound to ${addr.slice(0, 8)}...`,
            });
          } catch (e) {
            console.warn("[Auth] Failed to sync session with wallet:", e);
          }
        }}
        onDisconnected={async () => {
          setAddress(null);
          setConnectionMode("none");
          try {
            await logoutMutation.mutateAsync();
            void utils.auth.me.invalidate();
            toast.info("Wallet Disconnected", {
              description: "Returned to guest session.",
            });
          } catch (e) {
            console.warn("[Auth] Logout error:", e);
          }
        }}
      />
      <aside className={`arena-sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="sidebar-topline">
          <div className="brand-lockup" aria-label="Nimiq Arena">
            <NimiqArenaLogo size={36} showText={true} />
          </div>
          <button
            className="icon-button mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileMenu(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-rule" />
        <p className="sidebar-kicker">THE GAME ROOM / 001</p>
        <nav className="side-nav" aria-label="Primary navigation">
          <a
            className="side-nav-link active"
            href="#featured"
            onClick={() => setMobileMenu(false)}
          >
            Discover <span>01</span>
          </a>
          <a
            className="side-nav-link"
            href="#games"
            onClick={() => setMobileMenu(false)}
          >
            Game library <span>03</span>
          </a>
          <Link
            className="side-nav-link"
            href="/games/ludo-league"
            onClick={() => setMobileMenu(false)}
          >
            Ludo League <span>PLAY</span>
          </Link>
          <Link
            className="side-nav-link"
            href="/join"
            onClick={() => setMobileMenu(false)}
          >
            Join a friend <span>JOIN</span>
          </Link>
          <Link
            className="side-nav-link"
            href="/leaderboard"
            onClick={() => setMobileMenu(false)}
          >
            Leaderboard <span>TOP</span>
          </Link>
          <Link
            className="side-nav-link"
            href="/profile"
            onClick={() => setMobileMenu(false)}
          >
            Player Profile <span>STATS</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-status">
            <span
              className={`status-dot ${providerState === "ready" ? "ready" : ""}`}
            />
            <div>
              <strong>{providerLabel}</strong>
              <span>
                {providerState === "ready"
                  ? "Nimiq Pay detected"
                  : "Awaiting host wallet"}
              </span>
            </div>
          </div>
          <button
            className="language-button"
            onClick={() =>
              toast(`Nimiq Pay language: ${language.toUpperCase()}`)
            }
          >
            <span>Language</span>
            <strong>{language.toUpperCase()}</strong>
          </button>
          <button
            className="language-button"
            onClick={() => setIsDevModalOpen(true)}
            style={{ marginTop: 8 }}
          >
            <span>Mini App SDK</span>
            <strong>INSPECT</strong>
          </button>
        </div>
      </aside>
      {mobileMenu && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenu(false)}
          aria-hidden="true"
        />
      )}

      <main className="arena-main">
        <header className="topbar">
          <button
            className="icon-button mobile-trigger"
            aria-label="Open navigation"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={20} />
          </button>
          <div className="topbar-brand">
            <span className="topbar-kicker">NIMIQ ARENA</span>
            <span className="topbar-title">
              A place to play, meet, and compete.
            </span>
          </div>
          <div className="top-actions">
            <button
              className="search-button"
              onClick={() => setIsIdentityModalOpen(true)}
              title="Arena Web3 Identity & Custom Handle"
              style={{
                borderColor: "rgba(245, 158, 11, 0.4)",
                color: "#f59e0b",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Sparkles size={14} />
              {user?.name && !user.name.startsWith("Player 1") && !user.name.startsWith("guest-")
                ? user.name
                : "Claim Identity (+1,000 Pts)"}
            </button>
            <button
              className="search-button"
              onClick={() => setIsFaucetOpen(true)}
              title="Get free Testnet NIM from the official PoS faucet"
              style={{ borderColor: "rgba(236, 153, 24, 0.4)", color: "#EC9918" }}
            >
              💧 Get Testnet NIM
            </button>
            <button
              className="search-button"
              onClick={() =>
                switchPlayer(
                  user?.name?.includes("1")
                    ? "Player 2 (Guest)"
                    : "Player 1 (Host)"
                )
              }
              title="Switch between Player 1 and Player 2 for two-client testing"
            >
              👤 {user?.name ? user.name : "Sign in as Player 1"}
            </button>
            <button className="wallet-button" onClick={connectWallet}>
              <WalletCards size={16} />{" "}
              {address ? (
                <>
                  {walletBalance !== null ? (
                    <span style={{ color: "#EC9918", fontWeight: 700, marginRight: "4px" }}>
                      {walletBalance.toFixed(1)} NIM ·
                    </span>
                  ) : null}
                  {formatAddress(address)}
                </>
              ) : (
                "Connect wallet"
              )}
            </button>
          </div>
        </header>

        <section className="platform-intro" id="featured">
          <div className="intro-copy">
            <div className="stamp-row">
              <span className="stamp orange">SEASON 01</span>
              <span className="stamp">WEB3 MULTI-GAME ARENA</span>
            </div>
            <p className="eyebrow">ON-CHAIN MICRO-STAKES ESPORTS</p>
            <h1>
              Enter the Nimiq
              <br />
              <em>Gaming Arena.</em>
            </h1>
            <p className="hero-dek">
              Provably fair multiplayer strategy games powered by the ultra-fast Nimiq blockchain.
              Claim your Web3 identity, invite friends to earn 5% match commissions, and compete for on-chain pots.
            </p>
            <div className="hero-actions" style={{ flexWrap: "wrap", gap: "12px" }}>
              <a
                href="#games"
                className="primary-action"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  boxShadow: "0 4px 16px rgba(245, 158, 11, 0.4)",
                  padding: "14px 24px",
                  fontSize: "14px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  textDecoration: "none",
                }}
              >
                <Gamepad2 size={18} /> BROWSE GAMES
              </a>
              <button
                type="button"
                className="secondary-chip"
                onClick={() => setIsIdentityModalOpen(true)}
                style={{ padding: "12px 18px" }}
              >
                <Sparkles size={16} /> Claim Identity (+1,000 Pts)
              </button>
              <Link className="text-action" href="/join" style={{ padding: "12px 16px" }}>
                <Coins size={16} /> Join by Match Code
              </Link>
            </div>
            <div className="trust-line">
              <ShieldCheck size={15} />
              <span>
                Live players, balances, and match results appear only when
                verified systems are connected.
              </span>
            </div>
          </div>
          <div className="feature-stage">
            <div className="feature-art">
              <img src={gameCards[0].image} alt="Ludo table preview" />
              <div className="feature-wash" />
              <div className="feature-copy">
                <span className="card-label">01 / FEATURED GAME</span>
                <h2>
                  {ludoQuery.data?.name ?? "Ludo"}
                  <br />
                  <em>League</em>
                </h2>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                  <Link className="stage-button" href="/games/ludo-league">
                    <Gamepad2 size={15} /> Play Arena
                  </Link>
                  <Link
                    className="stage-button"
                    href="/games/ludo-league"
                    style={{ background: "rgba(234, 179, 8, 0.2)", border: "1px solid rgba(234, 179, 8, 0.4)", color: "#facc15" }}
                  >
                    <Coins size={14} /> Wager Escrow
                  </Link>
                </div>
              </div>
              <span className="feature-chip" style={{ background: "rgba(34, 197, 94, 0.2)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.4)" }}>● LIVE ON NIMIQ TESTNET</span>
            </div>
            <div className="feature-footer">
              <span>
                <Zap size={13} /> FIRST ON THE TABLE
              </span>
              <span>STRATEGY / SOCIAL</span>
            </div>
          </div>
        </section>

        <section className="section-block" id="games">
          <div className="section-topline">
            <div>
              <p className="eyebrow">THE ARENA INDEX</p>
              <h2>
                Pick a room.
                <br />
                <em>Stay for the games.</em>
              </h2>
            </div>
            <button
              className="browse-link"
              onClick={() => unavailable("Full game library")}
            >
              <span>View all games</span>
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="game-grid">
            {gameCards.map((game, index) => (
              <article
                className={`game-card ${game.status === "FEATURED" ? "featured-card" : ""}`}
                key={game.title}
              >
                <div className={`game-card-art ${game.accent}`}>
                  <img src={game.image} alt="" />
                  <div className="game-card-shade" />
                  <span className="game-status">{game.status}</span>
                  <span className="game-index">0{index + 1}</span>
                </div>
                <div className="game-card-body">
                  <div>
                    <span className="card-label">{game.genre}</span>
                    <h3>{game.title}</h3>
                  </div>
                  <button
                    className="round-arrow"
                    onClick={() => {
                      if (game.title.includes("Ludo")) {
                        window.location.href = "/games/ludo-league";
                      } else if (game.title.includes("Connect")) {
                        window.location.href = "/games/connect-four";
                      } else {
                        toast.success("Community Vote Registered! ♟️", {
                          description:
                            "You voted for Chess as Game 003. Voting closes at the end of Season 1!",
                        });
                      }
                    }}
                    aria-label={`Open ${game.title}`}
                  >
                    <ArrowUpRight size={15} />
                  </button>
                  <p>{game.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Arena Ecosystem Navigation Grid */}
        <section className="section-block" id="hub-navigation" style={{ marginTop: "36px" }}>
          <div className="section-topline">
            <div>
              <p className="eyebrow">ARENA ECOSYSTEM</p>
              <h2>
                Standings, records,
                <br />
                <em>and community tables.</em>
              </h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            {/* Leaderboard Card */}
            <div
              style={{
                background: "linear-gradient(145deg, #131b2e 0%, #0d121f 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "rgba(245, 158, 11, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fbbf24",
                    marginBottom: "16px",
                  }}
                >
                  <Trophy size={22} />
                </div>
                <span className="card-label" style={{ color: "#fbbf24" }}>SEASON 01 RANKINGS</span>
                <h3 style={{ fontSize: "1.25rem", margin: "6px 0 10px 0", color: "#f8fafc" }}>
                  Global Leaderboards
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5" }}>
                  Explore top competitive Elo rankings, win streaks, and seasonal champion crowns across all Arena games.
                </p>
              </div>
              <Link
                href="/leaderboard"
                style={{
                  marginTop: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#fbbf24",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                View Standings <ArrowUpRight size={15} />
              </Link>
            </div>

            {/* Profile Card */}
            <div
              style={{
                background: "linear-gradient(145deg, #131b2e 0%, #0d121f 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "rgba(56, 189, 248, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#38bdf8",
                    marginBottom: "16px",
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <span className="card-label" style={{ color: "#38bdf8" }}>YOUR WEB3 RECORD</span>
                <h3 style={{ fontSize: "1.25rem", margin: "6px 0 10px 0", color: "#f8fafc" }}>
                  Player Profile & Identity
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5" }}>
                  Review your personal win-loss ratio, lifetime NIM earned, rating tier, and cryptographic match receipts.
                </p>
              </div>
              <Link
                href="/profile"
                style={{
                  marginTop: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Open Profile <ArrowUpRight size={15} />
              </Link>
            </div>

            {/* Join Private Match Card */}
            <div
              style={{
                background: "linear-gradient(145deg, #131b2e 0%, #0d121f 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "rgba(34, 197, 94, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#4ade80",
                    marginBottom: "16px",
                  }}
                >
                  <Coins size={22} />
                </div>
                <span className="card-label" style={{ color: "#4ade80" }}>CHALLENGE ROOMS</span>
                <h3 style={{ fontSize: "1.25rem", margin: "6px 0 10px 0", color: "#f8fafc" }}>
                  Join Friend by Code
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5" }}>
                  Have an invite code from a friend? Enter directly into a private match table with zero waiting time.
                </p>
              </div>
              <Link
                href="/join"
                style={{
                  marginTop: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  color: "#4ade80",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Enter Room <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* Referral & Points Engine Section */}
        <section className="section-block" id="referrals" style={{ marginTop: "36px" }}>
          <ReferralCard />
        </section>

        <section className="arena-rails" style={{ marginTop: "36px" }}>
          <div className="rail-card rail-dark">
            <span className="card-label">THE POINT OF THE ARENA</span>
            <h3>
              Play something
              <br />
              <em>worth coming back to.</em>
            </h3>
            <p>
              Games are the beginning. Community, progression, and fair
              competition are the long game.
            </p>
            <button
              className="rail-link"
              onClick={() => unavailable("Arena community")}
            >
              <Sparkles size={14} /> Explore the vision
            </button>
          </div>
          <div className="rail-card">
            <span className="card-label">NIMIQ WALLET / LIVE STATUS</span>
            <div className="rail-status">
              <span
                className={`status-dot ${address || providerState === "ready" ? "ready" : ""}`}
              />
              <strong>{providerLabel}</strong>
            </div>
            <h3>
              {address
                ? `Connected: ${formatAddress(address)}`
                : providerState === "ready"
                  ? "Nimiq Pay mobile host ready."
                  : "Connect via Nimiq Hub or enter address."}
            </h3>
            <p>{providerMessage}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="rail-link" onClick={connectWallet}>
                <WalletCards size={14} />{" "}
                {address ? "Manage Wallet" : "Connect Nimiq Wallet"}
              </button>
              <button className="rail-link" onClick={() => setIsDevModalOpen(true)}>
                <Terminal size={14} /> Inspect Host
              </button>
            </div>
          </div>
        </section>

        <section className="status-strip" id="status">
          <div className="section-marker">
            <span className="marker-number">03</span>
            <span>TRUTH PANEL</span>
          </div>
          <div className="status-card">
            <div className="status-icon">
              <Radio size={18} />
            </div>
            <div>
              <span className="card-label">NIMIQ PAY</span>
              <h2>
                {providerState === "ready"
                  ? "Provider is ready"
                  : "Wallet host not connected"}
              </h2>
              <p>{providerMessage}</p>
              <button
                className="rail-link"
                onClick={() => setIsDevModalOpen(true)}
                style={{ marginTop: 8 }}
              >
                <Terminal size={14} /> Inspect Mini App SDK
              </button>
            </div>
            <span
              className={`state-chip ${providerState === "ready" ? "good" : "muted"}`}
            >
              {providerLabel}
            </span>
          </div>
          <div className="status-card payment-card">
            <div className="status-icon orange-icon">
              <Coins size={18} />
            </div>
            <div>
              <span className="card-label">NIM ENTRY</span>
              <h2>
                {paymentPhase === "submitted"
                  ? "Awaiting verification"
                  : paymentPhase === "confirming"
                    ? "Confirm in Nimiq Pay"
                    : paymentPhase === "rejected"
                      ? "Payment rejected"
                      : paymentPhase === "failed"
                        ? "Payment failed"
                        : paymentPhase === "expired"
                          ? "Intent expired"
                          : "Pay the entry"}
              </h2>
              <p>
                {paymentPhase === "submitted"
                  ? "Hash received. Arena has not credited anything until the server verifies it."
                  : "The amount and recipient come from a server-created intent."}
              </p>
              <button
                className="pay-entry-button"
                onClick={payEntry}
                disabled={
                  paymentPhase === "creating" ||
                  paymentPhase === "confirming" ||
                  paymentPhase === "submitted"
                }
              >
                {paymentPhase === "creating"
                  ? "Creating intent…"
                  : paymentPhase === "confirming"
                    ? "Waiting for approval…"
                    : paymentPhase === "submitted"
                      ? "Verification pending"
                      : "Pay with Nimiq Pay"}
              </button>
            </div>
            <span
              className={`state-chip ${paymentPhase === "submitted" ? "good" : "muted"}`}
            >
              {paymentPhase === "submitted"
                ? "SUBMITTED"
                : paymentPhase === "confirming"
                  ? "CONFIRMING"
                  : paymentPhase === "expired"
                    ? "EXPIRED"
                    : "NOT SETTLED"}
            </span>
          </div>
          <div className="status-card">
            <div className="status-icon">
              <Trophy size={18} />
            </div>
            <div>
              <span className="card-label">MULTIPLAYER</span>
              <h2>No rooms open</h2>
              <p>
                Real matchmaking and online players are not connected in this
                build.
              </p>
            </div>
            <span className="state-chip muted">NOT LIVE</span>
          </div>
        </section>

        {/* Real Leaderboard Section */}
        <section className="leaderboard-section" id="leaderboard">
          <div className="leaderboard-header">
            <div className="stamp-row">
              <span className="stamp orange">
                {seasonQuery.data?.name ?? "SEASON 01"}
              </span>
              <span className="stamp">
                {seasonQuery.data?.status?.toUpperCase() ?? "ACTIVE"}
              </span>
            </div>
            <p className="eyebrow">AUTHORITATIVE RANKINGS</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px" }}>
              <h2>Leaderboard</h2>
              <Link href="/leaderboard" style={{ fontFamily: "IBM Plex Mono", fontSize: "11px", color: "var(--orange)", fontWeight: 600 }}>
                Open Full Standings Page →
              </Link>
            </div>
            <p className="section-note">
              Rankings are calculated directly from verified database match
              results using server-authoritative Elo rating. No simulated or
              fake users.
            </p>
          </div>

          <div className="leaderboard-card">
            {leaderboardQuery.isLoading ? (
              <div className="empty-state-box">
                <p>Loading authoritative leaderboard records…</p>
              </div>
            ) : leaderboardQuery.data && leaderboardQuery.data.length > 0 ? (
              <div className="leaderboard-table-container">
                <table className="arena-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>Rating</th>
                      <th>Record</th>
                      <th>Win Rate</th>
                      <th>Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardQuery.data.map((entry: any) => (
                      <tr key={entry.userId}>
                        <td>
                          <span
                            className={`rank-badge ${entry.rank <= 3 ? `top-${entry.rank}` : ""}`}
                          >
                            #{entry.rank}
                          </span>
                        </td>
                        <td>
                          <strong>{entry.userName}</strong>
                        </td>
                        <td>
                          <span className="rating-pill">{entry.rating}</span>
                        </td>
                        <td>
                          {entry.wins}W - {entry.losses}L
                        </td>
                        <td>{entry.winRate}%</td>
                        <td>
                          {entry.currentStreak > 0 ? (
                            <span>🔥 {entry.currentStreak}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <Trophy size={28} />
                <p>
                  No competitive matches completed in this season yet.
                  <br />
                  Play a challenge match in <strong>Ludo League</strong> to
                  appear on the leaderboard!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Real Player Profile & Rating History Section */}
        <section className="profile-section" id="profile">
          <div className="profile-header">
            <span className="stamp orange">COMPETITIVE RECORD</span>
            <p className="eyebrow">YOUR ARENA PROFILE</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px" }}>
              <h2>{user ? user.name || "Player Profile" : "Player Profile"}</h2>
              <Link href="/profile" style={{ fontFamily: "IBM Plex Mono", fontSize: "11px", color: "var(--orange)", fontWeight: 600 }}>
                Open Full Profile Page →
              </Link>
            </div>
            <p className="section-note">
              Real-time competitive metrics, win streaks, and persisted rating
              transaction history.
            </p>
          </div>

          <div className="profile-card">
            {user ? (
              <>
                <div className="stat-card-grid">
                  <div className="stat-card">
                    <span className="stat-label">Elo Rating</span>
                    <span className="stat-value">
                      {statsQuery.data?.rating ?? 1000}
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Season Rank</span>
                    <span className="stat-value">
                      {statsQuery.data?.rank ? `#${statsQuery.data.rank}` : "—"}
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Win / Loss</span>
                    <span className="stat-value">
                      {statsQuery.data?.wins ?? 0}W /{" "}
                      {statsQuery.data?.losses ?? 0}L
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Win Rate</span>
                    <span className="stat-value">
                      {statsQuery.data?.winRate ?? 0}%
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Current Streak</span>
                    <span className="stat-value">
                      🔥 {statsQuery.data?.currentStreak ?? 0}
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Matches Played</span>
                    <span className="stat-value">
                      {statsQuery.data?.matchesPlayed ?? 0}
                    </span>
                  </div>
                </div>

                <div className="history-section">
                  <span className="card-label">RATING HISTORY</span>
                  {statsQuery.data?.history &&
                  statsQuery.data.history.length > 0 ? (
                    <div className="leaderboard-table-container">
                      <table className="arena-table">
                        <thead>
                          <tr>
                            <th>Outcome</th>
                            <th>Opponent</th>
                            <th>Change</th>
                            <th>New Rating</th>
                            <th>Match ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsQuery.data.history.map((item: any) => (
                            <tr key={item.id}>
                              <td>
                                <strong>
                                  {item.outcome.replace("_", " ").toUpperCase()}
                                </strong>
                              </td>
                              <td>{item.opponentName}</td>
                              <td>
                                <span
                                  className={
                                    item.ratingChange >= 0
                                      ? "delta-pos"
                                      : "delta-neg"
                                  }
                                >
                                  {item.ratingChange >= 0
                                    ? `+${item.ratingChange}`
                                    : item.ratingChange}
                                </span>
                              </td>
                              <td>
                                <span className="rating-pill">
                                  {item.newRating}
                                </span>
                              </td>
                              <td>
                                <small>{item.matchId}</small>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state-box">
                      <p>
                        No rating changes recorded yet. Play a match to build
                        your history!
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state-box">
                <p>
                  Sign in to view your real competitive profile and history.
                </p>
                <div style={{ marginTop: "14px" }}>
                  <button
                    className="primary-action"
                    onClick={() => switchPlayer("Player 1 (Host)")}
                  >
                    Sign in as Player 1
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="arena-footer">
          <div className="footer-mark">
            <img
              src="/manus-storage/nimiq-arena-mark_d1d871ea.png"
              alt=""
              className="footer-brand-mark"
            />
            <Sparkles size={15} />
            <span>THE GAME ROOM IS OPENING</span>
          </div>
          <span>Nimiq Arena / Multi-game platform foundation / 2026</span>
          <button onClick={() => unavailable("Terms and safeguards")}>
            <ShieldCheck size={14} /> Safeguards <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
    </div>
  );
}
