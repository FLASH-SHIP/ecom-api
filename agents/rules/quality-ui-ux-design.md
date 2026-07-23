---
title: UI/UX & Motion Quality Standards
impact: HIGH
tags: quality, ui, ux, design, motion, ui-skills
---

## UI/UX & Motion Quality Standards

Follow these guidelines for all front-end interface developments:

### UI Skills CLI Workflow
Before starting any UI-related coding task (in `apps/admin`, `apps/web`, or `apps/customer`), you must run the `ui-skills` CLI to retrieve curated expert guidance:
1. Run `npx ui-skills start` to review the protocol.
2. Search categories or list skills using `npx ui-skills list --category <category>`.
3. Load the narrowest relevant skill via `npx ui-skills get <slug>` (e.g., `pbakaus/animate` for micro-interactions, `jakubantalik/transitions-dev` for transitions).
4. Apply the loaded instructions to your code.

### Timing & Duration (The 100/300/500 rule)
*   **100–150ms** (Instant feedback): Button press, checkbox/toggle switches, color shifts.
*   **200–300ms** (State changes): Menu dropdowns, tooltips, list item hover.
*   **300–500ms** (Layout changes): Accordion expansions, modals opening, side drawers.
*   **Exit animations**: Always make exit animations snappier (~75% of entrance duration).

### Easing Curves
Avoid browser default ease transitions. Define and use premium cubic-bezier easing curves:
*   **Natural deceleration**: `cubic-bezier(0.25, 1, 0.5, 1)` (Quart Out - smooth & natural).
*   **Decisive/Snappy**: `cubic-bezier(0.16, 1, 0.3, 1)` (Expo Out - premium & confident).
*   **NEVER** use bounce or elastic curves (`cubic-bezier(0.34, 1.56, ...)`) in standard business app interfaces; they feel dated.

### Animation Performance (Anti-Jank)
*   **Composite-only properties**: For movement, prioritize animating `transform` (`scale`, `translate`) and `opacity`.
*   **Casual layout animation**: Avoid animating layout-driving properties (`width`, `height`, `top`, `left`, margins) directly. If height transitions are needed (e.g. accordions), use CSS grid rows animation (`grid-template-rows: 0fr` to `1fr`) with `overflow: hidden`.
*   **GPU acceleration**: Apply `will-change: transform, opacity` sparingly to specific target elements during animation, never preemptively on everything.

### Accessibility (A11y)
*   Ensure all animations respect user motion preferences by including standard media query overrides:
    ```css
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
    ```
