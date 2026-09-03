# Nimiq Arena — Physical Mobile Hardware Testing Protocol & Status

This document specifies the real-world testing procedures for physical mobile devices (Android Chrome and iOS Safari) and records the official verification status of Nimiq Arena's gameplay surface.

In adherence to our **Non-Negotiable Truth Policy**, this document distinguishes between what has been tested on simulated/emulated viewports and what has been executed on physical hardware.

---

## 1. Verification Status Summary

| Platform / Surface | Verification Method | Current Status | Notes |
| :--- | :--- | :---: | :--- |
| **Desktop Chrome / Edge / Firefox** | Direct automated and manual browser testing | **VERIFIED** | Full resolution 1280px+ |
| **Emulated Mobile Viewports** | Automated viewport resizing (375px, 390px, 412px, 768px) | **VERIFIED BY EMULATION** | CSS layout, flex wrapping, multi-pawn scaling verified |
| **Physical Android Devices** | Real hardware testing on Android Chrome | **NOT VERIFIED ON PHYSICAL HARDWARE** | Field testing queued |
| **Physical iOS Devices** | Real hardware testing on iOS Safari | **NOT VERIFIED ON PHYSICAL HARDWARE** | Field testing queued |

---

## 2. Android Chrome Physical Device Protocol

When testing on physical Android devices (e.g. Google Pixel, Samsung Galaxy):

### A. Touch & Gesture Responsiveness
1. **Dice Button Tapping:**
   - Tap the dice button rapidly (3–4 quick taps).
   - *Verification:* Exactly one roll executes; button does not trigger double-tap zoom; no duplicate command alerts are shown.
2. **Pawn Touch Targets:**
   - Tap individual glowing pawns in the yard and on the track.
   - *Verification:* Tapping anywhere within the pawn circle registers immediately with zero perceptible touch lag. Non-movable pawns ignore touches cleanly.
3. **Multi-Pawn Cells (Safe Squares):**
   - When 2 or 3 pawns share a star safe square, tap each pawn individually.
   - *Verification:* The scaled 21px pawns are individually targetable; the active moving pawn elevates to the top layer (`z-index: 35`).

### B. Viewport & Scrolling Stability
1. **Vertical Page Scroll:**
   - Swipe to scroll up and down on the page while dragging fingers across the board.
   - *Verification:* Swiping across the board scrolls the page normally without accidentally selecting pawns or triggering moves.
2. **Zero Horizontal Overflow:**
   - Inspect the board frame at 100% zoom and when rotating between portrait and landscape.
   - *Verification:* The board fits within screen width (`max-width: min(94vw, 580px)`) with no horizontal scrollbar.

### C. Network & Backgrounding Resiliency
1. **Tab Backgrounding:**
   - Switch away from Chrome to another app for 15 seconds, then return.
   - *Verification:* The match stream reconnects cleanly; badge shifts from `Fallback Polling` to `Live SSE`; authoritative state matches the server without refresh.
2. **Network Transition:**
   - Toggle Wi-Fi off so device switches to cellular data during a match.
   - *Verification:* Exponential backoff reconnects within 2–4 seconds without losing turn ownership.

---

## 3. iOS Safari Physical Device Protocol

When testing on physical iPhone / iPad devices:

### A. WebKit Audio & Autoplay Restrictions
1. **User Gesture Audio Unlock:**
   - WebKit blocks `AudioContext` until an initial explicit user interaction.
   - *Verification:* Tapping the dice button or sound toggle unlocks audio; subsequent dice rolls, piece steps, and fanfare play clearly without console errors.
2. **Mute Switch Respect:**
   - Verify that the game's volume toggle cleanly mutes all synthesized audio when toggled off.

### B. Dynamic Viewport & Safe Areas
1. **Dynamic URL Bar & Home Indicator:**
   - Safari dynamically collapses the address bar on scroll and features a bottom home indicator bar.
   - *Verification:* The board and sidebar controls remain clear of the bottom home bar and notch/dynamic island (`env(safe-area-inset-bottom)`).
2. **Double-Tap Zoom Suppression:**
   - Rapidly double-tap the board grid or dice cube.
   - *Verification:* `touch-action: manipulation` prevents Safari from zooming in on the board.

### C. Reconnect on Lock Screen Resume
1. **Device Lock & Unlock:**
   - Lock the phone for 30 seconds during an active match, then unlock.
   - *Verification:* The game re-synchronizes with the authoritative database version, preserving participant seat and turn state.

---

## 4. Truth Policy Statement

No claim of physical hardware verification may be made in release notes, documentation, or user reports until the procedures above have been physically executed on actual hardware and signed off.
