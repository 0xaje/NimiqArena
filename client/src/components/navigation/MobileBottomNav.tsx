import React from "react";
import { useLocation, Link } from "wouter";
import { Gamepad2, Grid, Swords, Trophy, User } from "lucide-react";

interface MobileBottomNavProps {
  activeMatchesCount?: number;
}

export function MobileBottomNav({ activeMatchesCount = 0 }: MobileBottomNavProps) {
  const [location] = useLocation();

  const navItems = [
    {
      id: "home",
      label: "Home",
      href: "/",
      icon: Gamepad2,
      isActive: location === "/" || location === "",
    },
    {
      id: "games",
      label: "Games",
      href: "/games",
      icon: Grid,
      isActive: location.startsWith("/games"),
    },
    {
      id: "matches",
      label: "Matches",
      href: "/matches",
      icon: Swords,
      isActive: location.startsWith("/matches"),
      badge: activeMatchesCount > 0,
    },
    {
      id: "ranks",
      label: "Ranks",
      href: "/leaderboard",
      icon: Trophy,
      isActive: location === "/leaderboard" || location === "/syndicates" || location === "/guilds",
    },
    {
      id: "profile",
      label: "Profile",
      href: "/profile",
      icon: User,
      isActive: location === "/profile",
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
      <div className="max-w-md mx-auto w-full pointer-events-auto pb-safe bg-[#0d1321]/92 backdrop-blur-xl border-t border-[#242a39] shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-all relative ${
                  item.isActive
                    ? "text-[#f3b72c] font-bold scale-105"
                    : "text-[#94a3b8] hover:text-[#dde2f6]"
                }`}
              >
                {item.badge && (
                  <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] animate-pulse" />
                )}
                <Icon size={21} strokeWidth={item.isActive ? 2.4 : 1.8} />
                <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
