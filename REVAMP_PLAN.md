# JournalX UI/Logic Revamp Plan

Reference: Figma "Trading Design System" (node 22644-50974) — Poppins, Binance-yellow `#FCD535`, tokenized color/spacing/radius/elevation. Light theme is the Figma reference; dark theme derived from the gray ramp (`#181a20` canvas, `#1e2329` surfaces). Theme toggle persists via `localStorage('theme')` + `data-theme` attribute (already wired in `_app.js`).

## Foundation (done)

- `frontend/styles/tokens.css` — design tokens, light + dark. Namespaced (`--color-*`, `--jx-*`, primitives like `--yellow-300`) so legacy `globals.css` vars are untouched.
- `frontend/styles/jx-components.css` — component classes (`.jx-btn`, `.jx-input`, `.jx-card`, `.jx-stat-card`, `.jx-badge`, `.jx-tabs`, `.jx-sidebar`, `.jx-shell`, `.jx-modal`, `.jx-toast`).
- `frontend/components/ui/AppShell.jsx` — sidebar shell (expand/collapse, active route, theme toggle, logout).
- `frontend/components/ui/StatCard.jsx` — analytics stat card with delta badge + mini bars.

Both CSS files are imported in `_app.js` after `globals.css`. Everything is additive — no existing page changes yet, safe to push.

## Phase 1 — Internal product (UI + logic together)

Order, one page per push so main stays coherent:

1. **Dashboard** (`dashboard-web.jsx`, then mobile `dashboard.jsx`) — wrap in `AppShell`, replace hero stats with `StatCard` grid, restyle charts to token colors (`#2EBD85`/`#F6465D`/`#FCD535`). Logic: unify the three dashboard variants (`dashboard`, `dashboard-web`, `dashboard1`) into one responsive page; remove the width-based redirect.
2. **Trades log** (`trade.jsx`, `view-trades.jsx`) — table per Figma, Buy/Long–Sell/Short badges, filters/dropdowns from design system.
3. **Add trade** (`add-trade.jsx` + `components/addTrade/`) — `.jx-field`/`.jx-input` forms with validation states; image upload (Backblaze) with progress + preview.
4. **Accounts, Settings, Billing** — cards, modals, toasts.
5. Trade heatmap + calendar (Figma "Trades Heatmap", "Date & Time Picker").

## Phase 2 — Landing page

Rebuild `components/landingPage/*` on the same tokens.

## Phase 3 — Legal pages

`privacy-policy`, `terms-services`, `refund-policy` — single shared layout component.

## Logic cleanup (alongside pages as touched)

- Unify axios calls into one API client (base URL, auth header, error handling).
- Delete dead page variants (`login1`, `register1`, `dashboard1`, `addTrade` vs `add-trade`).
- Consolidate chart libs (3 today: apexcharts, lightweight-charts, recharts) → pick per use, drop the rest.
- Drop `moment` (keep `date-fns` or `dayjs`, not both).
- **Security: backend `.env` and frontend `.env.local` contain real secrets and appear to be in git. Rotate keys (Mongo, B2, OAuth, Resend, OpenAI, Telegram) and add to `.gitignore`.**

## Token cheat-sheet

| Use | Light | Dark |
| --- | --- | --- |
| Primary | `#FCD535` (hover `#F0B90B`) | same |
| Canvas / Surface | `#F8F9FB` / `#FFFFFF` | `#181A20` / `#1E2329` |
| Text primary / muted | `#1E2329` / `#707A8A` | `#EAECEF` / `#AEB4BC` |
| Buy / Sell | `#2EBD85` / `#F6465D` | same |
| Border | `#E6E8EB` | `#2B3139` |

Type: Poppins — Display 40/48 · H1 32/40 · H2 24/32 · H3 20/28 · Title 16/24 · Body 14/20 · Small 13/18 · Caption 12/16 · Stat 28/34.
