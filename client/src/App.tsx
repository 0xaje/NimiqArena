import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { initTelegramApp } from "./lib/telegram";
import Home from "./pages/Home";
import LudoDetail from "./pages/LudoDetail";
import Connect4Detail from "./pages/Connect4Detail";
import JoinMatch from "./pages/JoinMatch";
import MatchRoom from "./pages/MatchRoom";
import Leaderboard from "./pages/Leaderboard";
import SyndicateRanks from "./pages/SyndicateRanks";
import MatchReplay from "./pages/MatchReplay";
import PlayerProfile from "./pages/PlayerProfile";
import GamesShowroom from "./pages/GamesShowroom";
import MatchesHub from "./pages/MatchesHub";
import Earn from "./pages/Earn";
import NotFound from "./pages/NotFound";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/games" component={GamesShowroom} />
      <Route path="/games/ludo-league" component={LudoDetail} />
      <Route path="/games/connect-four" component={Connect4Detail} />
      <Route path="/matches" component={MatchesHub} />
      <Route path="/matches/:id/replay" component={MatchReplay} />
      <Route path="/replay" component={MatchReplay} />
      <Route path="/matches/:id" component={MatchRoom} />
      <Route path="/join" component={JoinMatch} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/syndicates" component={SyndicateRanks} />
      <Route path="/guilds" component={SyndicateRanks} />
      {/*
        /playoffs, /explorer, /watch, /tx/:hash, /cashout-receipt, /victory
        and their aliases used to route to fully hardcoded pages — a
        tournament bracket, a blockchain explorer, and a payout receipt
        that made zero backend calls between them. Each rendered fabricated
        data (a fake tx hash, a made-up validator quorum, an invented match
        result) as if it were real, reachable by anyone with the URL. Pulled
        rather than left half-built; they fall through to the catch-all
        below like any other route that doesn't exist yet. The page
        components are still in client/src/pages if someone wires them to
        real data later.
      */}
      <Route path="/profile" component={PlayerProfile} />
      <Route path="/earn" component={Earn} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { NimiqWalletProvider } from "./lib/useNimiqWallet";

export default function App() {
  useEffect(() => {
    initTelegramApp();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <NimiqWalletProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </NimiqWalletProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
