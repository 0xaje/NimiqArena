import { useState, useEffect } from "react";

/**
 * Standard benchmark rate: 1 NIM ≈ $0.00038866 USD (~2,573 NIM per $1 USD)
 * Fetches real-time price from CoinGecko API when online, with graceful fallback.
 */
export const DEFAULT_NIM_USD_PRICE = 0.00038866;

let _cachedPrice: number = DEFAULT_NIM_USD_PRICE;
let _lastFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchNimiqUsdPrice(): Promise<number> {
  const now = Date.now();
  if (now - _lastFetchedAt < CACHE_TTL_MS && _cachedPrice > 0) {
    return _cachedPrice;
  }
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=usd",
      { headers: { Accept: "application/json" } }
    );
    if (res.ok) {
      const data = await res.json();
      const price = data?.["nimiq-2"]?.usd;
      if (typeof price === "number" && price > 0) {
        _cachedPrice = price;
        _lastFetchedAt = now;
      }
    }
  } catch {
    // Network or rate-limit fallback
  }
  return _cachedPrice;
}

export function useNimiqPrice() {
  const [priceUsd, setPriceUsd] = useState<number>(_cachedPrice);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchNimiqUsdPrice().then(price => {
      if (mounted) {
        setPriceUsd(price);
        setIsLive(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const nimToUsd = (nim: number): number => {
    return Math.max(0, nim) * priceUsd;
  };

  const usdToNim = (usd: number): number => {
    if (!priceUsd || priceUsd <= 0) return 0;
    return Math.max(1, Math.round(usd / priceUsd));
  };

  const formatUsd = (usd: number): string => {
    if (usd === 0) return "$0.00";
    if (usd < 0.01 && usd > 0) return "< $0.01";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usd);
  };

  return {
    priceUsd,
    isLive,
    nimToUsd,
    usdToNim,
    formatUsd,
  };
}
