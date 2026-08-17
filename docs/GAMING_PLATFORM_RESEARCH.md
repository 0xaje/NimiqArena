# Gaming Platform Research

## Research direction

The redesign should make Nimiq Arena feel like a **game destination**, not a single-game landing page. The strongest platform references organize the home experience around discovery, featured content, browsing, and a clear next action while still giving each game an individual identity.

## Patterns observed

| Reference | Observed pattern | Arena translation |
|---|---|---|
| Steam Discovery Update | Personalized home page, recommendation feed, discovery queue, tags, filters, follow/ignore actions, and visible library state. | Build a Browse / game-library layer with genre and mode tags, clear availability states, and a future “For you” surface without inventing recommendations today. |
| Epic Games Store | Strong featured carousel, “discover something new,” free games, new releases, trending, top sellers, and category blocks. | Use a featured “Arena spotlight,” a horizontal game rail, and distinct collections such as Play now, Coming soon, and Free to enter. |
| Game Library case study | Nostalgia and personality can create emotional engagement when balanced with modern usability; discovery and social connection are central to a multi-game platform. | Give Arena a memorable game-room identity with tactile board/court motifs, playful labels, and a clear but expandable navigation model. |

## Design decision for Nimiq Arena

Use a **Game Room / Matchday Network** system: a dark ink-blue stage with warm paper cards, electric Nimiq blue, Arena orange as the action color, and game-specific accent colors. The homepage should answer four questions quickly: what can I play now, what is coming next, where do I belong, and what is the real state of wallet/payment/multiplayer features.

The first frontend pass should feature Ludo as the **featured game**, not the entire product. Additional game slots should be visible as clearly labeled “Coming soon” or “Not implemented” cards, never as fake playable products. The page should have a platform-level header, a game-library rail, a featured game area, a live-status panel, and a compact “Arena index” for future expansion.

## Sources

1. [Steam Discovery Update](https://store.steampowered.com/about/newstore) — official Steam product/design description covering personalized home, recommendation feed, discovery queue, filters, and library state.
2. [Epic Games Store](https://store.epicgames.com/en-US/) — current store layout showing featured carousel, discovery, free games, new releases, trending, and top-category rails.
3. [Game Library UX case study](https://www.autumnmunz.com/projects/game-library-website) — design case study on nostalgia, discovery, personality, and social connection in game-library platforms.
