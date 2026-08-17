# Nimiq Arena — Design Direction

## Three stylistic approaches

### Theme Name: Courtline Editorial

Very Brief Intro: A sports-editorial interface inspired by printed match programs, scorecards, and contemporary club identity. It feels grounded, competitive, and credible rather than crypto-generic.
Probability: 0.07

### Theme Name: Neon Matchroom

Very Brief Intro: A dark arcade command center with electric accents, live match energy, and high-contrast game telemetry. It creates urgency and spectacle for players who want the arena to feel like an event.
Probability: 0.03

### Theme Name: Sunlit Commons

Very Brief Intro: A warm, tactile community clubhouse that treats play, trust, and money as human-scale interactions. It uses paper-like surfaces, optimistic color, and approachable language.
Probability: 0.09

## Selected approach: Courtline Editorial

### Design Movement

Contemporary sports editorial: the visual language of premium football matchday programs, archival scorecards, and independent athletic clubs, translated into a modern Nimiq Mini App.

### Core Principles

1. **Earned credibility:** Every live claim is explicit, sourced, or labeled as unavailable; the interface must never imply a transaction, player, or ranking exists when it does not.
2. **Tactical asymmetry:** Use offset columns, scorecard rails, and cropped editorial panels instead of a centered SaaS grid.
3. **Material contrast:** Pair ink-like navy, warm paper, and a single Nimiq-orange signature accent with fine rules, halftone texture, and controlled shadows.
4. **Matchday focus:** The first screen should make the game loop legible: choose a mode, understand the status, and see what is real versus not yet implemented.

### Color Philosophy

The palette draws from stadium print ephemera: deep ink navy communicates rules and trust; warm ivory reads as human and archival; a sunlit saffron-orange is reserved for action, current turn, and Nimiq identity. Muted clay and cool slate support secondary states without turning the product into a generic fintech dashboard. The orange is intentionally scarce so an action feels like a whistle, not decoration.

### Layout Paradigm

A left-hand brand spine anchors the experience while the main content behaves like a spread: a large editorial hero, a narrow match-status rail, and stacked scorecard modules. On small screens the spine becomes a compact top rail and the hero remains left-aligned, preserving the club-program feeling without forcing a desktop grid.

### Signature Elements

- A **courtline rule**: thin orange and navy lines used as section dividers, active indicators, and scorecard baselines.
- **Matchday stamps**: compact uppercase labels such as `NOT LIVE`, `BUILD 01`, and `RULES FIRST` that make implementation status visible.
- **Halftone playfield texture**: restrained dotted field markings behind the hero and board preview, never behind critical text.

### Interaction Philosophy

Interactions should feel like a referee’s signal: clear, immediate, and reversible. Active controls use a small physical press and a decisive color change. Unavailable capabilities open a truthful explanation rather than pretending to proceed. Navigation is contextual and always leaves a visible path back to the match overview.

### Animation

Use short 160–240ms ease-out transitions for buttons, tabs, stamps, and panel reveals. Entrance motion should be a slight horizontal lift with opacity, staggered by 40ms across scorecard rows. The board preview may use a slow, low-amplitude shimmer on the courtline only when motion is allowed. Avoid continuous gamification, flashing money, or animations that could imply a live event. Respect `prefers-reduced-motion` by removing non-essential transforms and shimmer.

### Typography System

Use **DM Serif Display** for the Arena wordmark and major editorial headlines, paired with **IBM Plex Sans** for navigation, body copy, labels, and data. Headings use sentence case with compact line-height; micro-labels use IBM Plex Sans at 11–12px, uppercase, 0.12em letter spacing. Numbers in scorecards use IBM Plex Mono to make state and amounts easy to scan.

### Brand Essence

Nimiq Arena is the honest matchroom for NIM-powered Ludo, built for players who want real games, clear stakes, and no pretend activity.

Personality adjectives: **disciplined, spirited, transparent**.

### Brand Voice

Headlines are direct and matchday-specific. CTAs describe the actual next step, never an inflated promise. Microcopy explains unavailable functionality with calm precision.

Example lines:

- “Pick your table. We’ll show you what’s live.”
- “Wallet connection is not wired yet — the match stays honest until it is.”

### Wordmark & Logo

The mark is a four-corner court token: a rounded square split by a diagonal courtline, with one corner lifted into a small flag shape. It should work as a bold symbol without text, and the wordmark should pair a custom condensed “ARENA” lockup with a small NIMIQ monogram rather than a default font treatment.

### Signature Brand Color

**Arena Orange — `#F26A3D`**. It is the unmistakable whistle/action color: warm, physical, and reserved for decisions that move a match forward.

## Style Decisions

- Use warm ivory surfaces and dark ink navy as the base, not a purple gradient or generic crypto-black.
- Make the current implementation status visible in the interface; do not disguise placeholders as production data.
- Prefer offset editorial composition, courtline rules, halftone textures, and compact stamps over uniform rounded cards.
- Keep wallet, payment, multiplayer, leaderboard, and matchmaking actions disabled or clearly labeled until real integrations exist.
