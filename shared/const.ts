export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// One-time nonce cookie that binds an OAuth login to the browser that started
// it. The `__Host-` prefix forces the cookie host-only (Secure, Path=/, no
// Domain), so a sibling *.manus.space site cannot plant a matching value in a
// victim's browser.
export const OAUTH_STATE_COOKIE = "__Host-oauth_state";

// `state` carries the callback redirect URI (used at token exchange) plus the
// CSRF nonce. Defined here so the client encoder and server decoder never drift.
export type OAuthState = { redirectUri: string; nonce?: string };

export const encodeOAuthState = (state: OAuthState): string =>
  btoa(JSON.stringify(state));

export const decodeOAuthState = (state: string): OAuthState => {
  let decoded: string;
  try {
    decoded = atob(state);
  } catch {
    // Malformed base64 (e.g. attacker-supplied garbage). Return no nonce so the
    // callback's CSRF guard rejects it with 403 — never throw, since the caller
    // runs outside the request handler's try/catch.
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
    // Legacy links: `state` was a bare base64(redirectUri) with no nonce.
  }
  return { redirectUri: decoded };
};

/* ---------------------------------------------------------------------------
   Match liveness
   
   Client and server both reason about whether a player is still there, so the
   thresholds live here rather than being restated on each side, where they
   drifted into contradicting each other.
   --------------------------------------------------------------------------- */

/** How often a client in a match reports that it is still there. */
export const PLAYER_HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * How stale a player's last contact may get before the server treats them as
 * disconnected. Three missed beats, so a single slow request or a brief
 * network blip never counts against a player.
 */
export const PLAYER_HEARTBEAT_TIMEOUT_MS = 45_000;

/**
 * When the UI starts telling the opponent that someone looks absent.
 *
 * Must sit above the heartbeat interval - a beat that has simply not come due
 * yet is not a disconnect - and below the server's timeout, so the warning
 * leads the state change rather than contradicting it. This was 14s against a
 * 15s heartbeat, so it fired on every cycle of every match.
 */
export const OPPONENT_PRESENCE_WARNING_MS = 32_000;

/**
 * How long a disconnected player has to come back before the match is awarded
 * to their opponent. The UI counts this down, so it must be the same number
 * the server acts on - the countdown claimed 60s against a ten-minute rule.
 */
export const ABANDONMENT_GRACE_MS = 10 * 60_000;

/**
 * How long a match may sit unstarted before it is expired. This is a lobby
 * timeout: it applies to a waiting match, never to one being played.
 */
export const MATCH_LOBBY_TIMEOUT_MS = 15 * 60_000;

/**
 * The window a started match gets, refreshed from the moment play begins.
 * Generous, because it exists only to reap matches that stall forever, not to
 * put a clock on a game.
 */
export const MATCH_PLAY_WINDOW_MS = 3 * 60 * 60_000;
