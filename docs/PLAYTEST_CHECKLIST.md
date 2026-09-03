# Nimiq Arena — Human Playtest Protocol & Checklist

This document is the official field-testing protocol for human playtesters evaluating Nimiq Arena's flagship game: **Ludo**.

> [!IMPORTANT]
> **Observer Rule:** Do not explain the game or coach the tester unless they are completely blocked. The interface must explain itself. Observe where hesitation, confusion, or incorrect assumptions occur.

---

## Part 1: First Impression & Orientation

| Test Item | Observation Target | Tester Feedback / Notes |
| :--- | :--- | :--- |
| **Product Purpose** | Does the tester immediately recognize that this is a competitive Web3 board game platform powered by Nimiq? | |
| **Game Discovery** | Can the tester locate and select Ludo without guidance? | |
| **Mode Selection** | Does the tester understand the difference between **Practice vs Bot** and **Challenge a Friend**? | |
| **Match Launch** | Does clicking "Practice vs Bot" transition smoothly into the match room without delay or errors? | |
| **Turn Recognition** | Upon entering the match room, does the player immediately know whose turn it is? | |
| **Next Action Clarity** | Does the player know what action to perform without being prompted (e.g. rolling the pulsing dice)? | |

---

## Part 2: Core Ludo Gameplay Flow

| Test Item | Verification Steps | Pass / Fail & Observations |
| :--- | :--- | :--- |
| **Dice Roll** | Click the pulsing dice button. Does it roll smoothly with clear audio feedback and display the result? | |
| **Initial Yard Exit** | If a 6 is rolled, does a pawn in the yard start glowing and hopping? Is it obvious that tapping it moves it to the start tile? | |
| **6-Roll Bonus Turn** | When a 6 is rolled, does the banner say *"🌟 Rolled a 6! Select a glowing pawn (Bonus roll awaits!)"*? Does the player get their extra roll after moving? | |
| **No Legal Moves** | When rolling a non-6 with all pawns in the yard (or blocked), does the banner show *"🎲 You rolled X (no legal moves available) — Turn passed"*? Is the turn handoff clear? | |
| **Pawn Selection** | Can the player tap the glowing pawn easily? Do non-movable pawns correctly ignore clicks? | |
| **Movement Animation** | Does the pawn move smoothly along the track with sound effects? | |
| **Captures** | If the player lands on an opponent pawn on an active track cell, is the opponent pawn captured and sent back to yard? | |
| **Safe Star Squares** | When landing on a star tile, does the pawn show as safe? If two pawns share a star cell, do both remain visible? | |
| **Home Stretch & Finish** | Can pawns enter the colored home lane? Does an exact roll allow them to reach the center goal? | |
| **Victory & Settlement** | When all pawns reach home, is the winner fanfare played? Is the victory banner displayed with truthful ledger entitlement? | |

---

## Part 3: Autonomous Bot Behavior

| Test Item | Observation Target | Tester Feedback / Notes |
| :--- | :--- | :--- |
| **Pacing** | Does the bot move at a natural human pace (~450ms pacing) rather than instantaneous or sluggish? | |
| **Status Feedback** | Does the bot banner display *"🤖 Nimiq AI is taking its turn…"* while the bot acts? | |
| **Turn Relinquishment** | Does the bot reliably return control to the player after completing its sequence? | |
| **No Freezes** | Does the game ever freeze, hang, or leave the player wondering if the match broke? | |
| **Multi-Turn Extra Rolls** | When the bot rolls a 6 or captures, does it take its bonus roll correctly without getting stuck in an infinite loop? | |

---

## Part 4: Real Multiplayer Verification (Two Independent Clients)

Test with two separate browser windows (e.g. Window 1 as Host, Window 2 as Guest in incognito):

| Test Item | Verification Steps | Pass / Fail & Observations |
| :--- | :--- | :--- |
| **Invite & Join** | Player A clicks "Challenge a Friend", shares the 8-character join code. Player B enters the code on `/join`. Does the match transition to `in_progress` immediately on both screens? | |
| **Turn Alternation** | Player A rolls and moves. Does Player B see the move happen live via SSE? Does Player B's turn indicator activate promptly? | |
| **Rapid Clicking** | If a player rapidly spams the dice or pawns during turn transitions, does the system prevent duplicate actions without error alerts? | |
| **Mid-Game Refresh** | If Player A refreshes the browser mid-game, does the match state restore identically? | |
| **SSE Reconnect** | If network drops or tab backgrounds, does the badge transition from `Live SSE` to `Fallback Polling` and resume cleanly? | |
| **Emotes & Quick Chat** | Do emote reactions (🚀, 🔥, 💎) and quick chat messages appear in real-time across both screens? | |

---

## Part 5: Issue Logging Template

For any issue observed during testing, log using this format:

```markdown
### ISSUE-[NUMBER]: [Brief Title]
- **Severity:** P0 (Blocker) | P1 (Critical UX) | P2 (Noticeable UX) | P3 (Cosmetic)
- **Reproduction Steps:**
  1. ...
  2. ...
- **Expected Behavior:** ...
- **Actual Behavior:** ...
- **Frequency:** Always | Frequent | Intermittent | Once
- **Environment:** Browser & OS (e.g. Chrome 120 on Linux / Safari on iOS)
- **Viewport:** Desktop 1280px / Mobile 390px
- **Authoritative Backend State:** ...
- **Client State:** ...
- **Root Cause:** ...
- **Fix Applied:** ...
- **Regression Test:** ...
```
