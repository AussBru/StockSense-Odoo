# StockSense IMS

A modular **inventory management system** — an Odoo-inspired "Inventory OS" covering
inventory core, sales, purchasing, returns, and reporting. Stock is modelled the way Odoo
does it: a set of *quants* (product × location quantities) fed by *documents* and recorded
in an append-only *stock ledger*.

The UI is an **ivory & black** theme with a full **dark mode**.

## Stack

| Concern     | Choice                                              |
| ----------- | --------------------------------------------------- |
| Frontend    | React 18, TypeScript 5.6, Vite 5                    |
| Styling     | Tailwind CSS 3 (PostCSS + autoprefixer)             |
| Routing     | react-router-dom 6                                   |
| 3D / visual | three.js — the `ShapeBlur` WebGL backdrop; gsap — `MagicBento` surfaces |
| Backend     | Express 5 (`server.js`) on port 5000                |
| Mail        | nodemailer — delivers password-reset OTPs            |
| State       | React Context (`StoreProvider`) + `localStorage`    |

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` starts **both** processes via `concurrently`:

| Process | What                | Where                   |
| ------- | ------------------- | ----------------------- |
| `api`   | `node server.js`    | http://localhost:5000   |
| `app`   | `vite --host`       | http://localhost:5173   |

Vite proxies `/api` → `http://localhost:5000` (see `vite.config.ts`).

**Demo login:** `demo@stocksense.app` / `Demo@123`

### Other scripts

| Script            | Description                                    |
| ----------------- | ---------------------------------------------- |
| `npm run server`  | API only                                       |
| `npm run client`  | Vite dev server only                           |
| `npm run build`   | `tsc -b` type-check, then production build     |
| `npm run preview` | Serve the production build                     |

### SMTP / password reset

OTP reset emails are sent by the Express API using nodemailer. Copy `.env.example` to
`.env` and set `SMTP_USER` / `SMTP_PASS` (plus optionally `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SERVICE`, `SMTP_FROM`). Without credentials the API still runs, `/api/send-otp`
returns a 500, and the UI falls back to showing the code in a demo inbox panel.

## Project structure

Sources live at the repository root (no `src/` directory).

```
index.html            Entry HTML; pre-paint theme script, loads /main.tsx
main.tsx              React root, imports ./index.css
App.tsx               All 40 routes + StoreProvider + BrowserRouter
store.tsx             Single store: state, all mutations, localStorage sync
types.ts              Domain model (documents, quants, ledger, orders, partners…)
server.js             Express API: /api/health, /api/send-otp
index.css             Tailwind entry + ivory/black CSS variables (light + .dark)
tailwind.config.js    darkMode: 'class' + semantic color tokens
vite.config.ts        react() plugin + /api proxy
vite-env.d.ts         /// <reference types="vite/client" />

components/
  AppShell.tsx        Sidebar, header, theme toggle, auth route guards
  AuthFrame.tsx       Split-screen auth layout + ShapeBlur backdrop
  ShapeBlur.tsx       WebGL blurred-shape component (React Bits)
  MagicBento.tsx      Animated bento card grid (React Bits)
  MagicBento.css      Bento styles, scoped to .bento-section / .bento-surface
  bentoShared.ts      Shared gsap particle/ripple plumbing + interaction hook
  AutoBentoSurfaces.tsx  Applies the bento treatment to all standard panels
  ThemeToggle.tsx     useTheme() hook + toggle button
  Operations.tsx      OperationList + OperationForm (shared by all doc types)
  Badges.tsx          StatusBadge / TypeBadge pills

lib/
  seed.ts             Demo dataset
  inventory.ts        Stock math, status/type class maps, filters
  csv.ts              CSV export helper
  utils.ts            uid(), SHA-256 hashing, OTP generation, date formatting

pages/                25 route components (dashboard, products, orders, reports, …)
```

## Theming: ivory & black + dark mode

Every color in the app is a **semantic token** backed by a CSS variable, so dark mode is a
single `.dark` class on `<html>` — no component needs to know which theme is active.

`tailwind.config.js` sets `darkMode: 'class'` and maps tokens to variables:

| Token          | Class                        | Role                        |
| -------------- | ---------------------------- | --------------------------- |
| `canvas`       | `bg-canvas`                  | Page background             |
| `surface`      | `bg-surface`                 | Cards, panels, inputs       |
| `surface-2`    | `bg-surface-2`               | Table heads, subtle fills   |
| `line`         | `border-line`                | Primary borders             |
| `line-soft`    | `border-line-soft`           | Row dividers                |
| `fg`           | `text-fg`                    | Primary text                |
| `fg-soft`      | `text-fg-soft`               | Tertiary text               |
| `fg-muted`     | `text-fg-muted`              | Secondary text              |
| `fg-subtle`    | `text-fg-subtle`             | Placeholders / empty states |
| `accent`       | `bg-accent`                  | Primary action              |
| `accent-fg`    | `text-accent-fg`             | Text on a primary action    |
| `sidebar`      | `bg-sidebar`                 | Always-black nav rail       |
| `on-sidebar`   | `text-on-sidebar`            | Text on the nav rail        |

`ink`, `muted` and `brand` are kept as **aliases** of `fg`, `fg-muted` and `accent`, so
older markup themes automatically.

The palette itself lives in `index.css` as space-separated RGB channels (so Tailwind's
opacity modifiers like `bg-accent/30` work):

|                | Light                | Dark                 |
| -------------- | -------------------- | -------------------- |
| canvas         | ivory `#F6F4EE`     | near-black `#0A0A0B` |
| surface        | `#FFFFFF`            | `#161618`            |
| accent         | black `#111111`      | ivory `#F2EFE6`      |
| fg             | black `#111111`      | ivory `#F2EFE6`      |
| sidebar        | black `#0E0E0F`      | black `#000000`      |

Because the accent inverts, the sidebar stays black in both themes and the primary button
flips black → ivory automatically.

### Adding a color

Prefer an existing token. If you truly need a new one, add the CSS variable to both `:root`
and `.dark` in `index.css`, then map it in `tailwind.config.js` with the
`rgb(var(--c-name) / <alpha-value>)` pattern.

### Status colors

Status and type pills (`lib/inventory.ts`) use light tints plus a `dark:` override, e.g.
`bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300`. Keep that pattern
for any new colored surface.

## ShapeBlur (WebGL backdrop)

`components/ShapeBlur.tsx` is the [React Bits](https://reactbits.dev) ShapeBlur component,
converted from JavaScript to TypeScript. It draws an SDF shape on a full-bleed WebGL quad
and reacts to pointer movement with a damped "circle" reveal.

It backs the login/signup/forgot-password split screen (`AuthFrame`), layered over the black
panel at `opacity-[0.16]`.

### Props

| Prop             | Type     | Default | Description                                  |
| ---------------- | -------- | ------- | -------------------------------------------- |
| `variation`      | `number` | `0`     | Shape variation compiled into the shader (0-3) |
| `pixelRatioProp` | `number` | `2`     | Pixel ratio override (use device pixel ratio) |
| `shapeSize`      | `number` | `1.2`   | Size of the shape                            |
| `roundness`      | `number` | `0.4`   | Corner roundness                             |
| `borderSize`     | `number` | `0.05`  | Border thickness                             |
| `circleSize`     | `number` | `0.3`   | Size of the hover circle effect              |
| `circleEdge`     | `number` | `0.5`   | Edge softness of the hover circle            |

### Usage

```tsx
import ShapeBlur from './components/ShapeBlur'

<div style={{ position: 'relative', height: '500px', overflow: 'hidden' }}>
  <ShapeBlur
    variation={0}
    pixelRatioProp={window.devicePixelRatio || 1}
    shapeSize={0.5}
    roundness={0.5}
    borderSize={0.05}
    circleSize={0.5}
    circleEdge={1}
  />
</div>
```

Notes:

- The component renders an **empty `div`** and appends its own `<canvas>`, so it must sit
  inside a sized, `position: relative` container.
- It is **lazy-loaded** via `React.lazy` in `AuthFrame`. `three` is ~520 kB minified;
  keeping it in its own chunk means the login form paints before WebGL arrives.
- `variation` is a shader compile-time `#define`, so changing it tears down and rebuilds the
  renderer. All other props are live uniforms.
- Cleanup disposes geometry, material and the WebGL context, and disconnects the
  `ResizeObserver` and pointer listeners.

## MagicBento (animated surfaces)

Two pieces, both built on `gsap`:

| File                            | Role                                                            |
| ------------------------------- | --------------------------------------------------------------- |
| `components/bentoShared.ts`     | Shared particle/ripple/GSAP plumbing and the `useCardInteractions` hook |
| `components/MagicBento.tsx`     | Card-grid component (data-driven, responsive)                    |
| `components/MagicBento.css`     | Styles, scoped to `.bento-section` / `.bento-surface`            |
| `components/AutoBentoSurfaces.tsx` | Applies the treatment to existing panels with no per-page edits |

### 1. The card grid

Used for the dashboard KPI row:

```tsx
<MagicBento
  cards={kpiCards}
  columns={5}
  compact
  enableTilt
  enableMagnetism
  clickEffect
  spotlightRadius={260}
  particleCount={10}
/>
```

Each entry in `cards` accepts `label`, `title`, `description`, `value`, `icon`,
`span: { col, row }`, `color`, `href`, and `onClick`. With no `cards` prop it falls back to the
upstream placeholder set.

Unlike upstream, `cards` is a prop (upstream hard-coded six placeholder cards, which made the
component unusable for real data) and grid spans are data-driven, so any card count lays out
correctly. Columns also collapse responsively — `--bento-cols-max` is the requested count and a
media-query `--bento-cols-cap` wins on narrow viewports, instead of squeezing cards into slivers.

### 2. Every other panel, automatically

The app has ~90 panels sharing the surface classes, spread over 20 pages, so rather than
wrapping each one, `AutoBentoSurfaces` (mounted once in `AppShell`) matches them by selector and
wires them with a single delegated listener set:

```
:is(div, form, section, article).border.border-line.bg-surface[class*="rounded-"]
```

The radius is matched as a substring because the codebase has two conventions — older pages use
`rounded-2xl`, newer ones `rounded-xl`. Matching is restricted to block containers so text inputs
and selects, which also carry `border-line bg-surface`, are never decorated.

That covers the stat cards, filter bars, data tables, warehouse/zone rows, and detail panels
throughout the app with **zero per-page changes**.

Behaviour differences from the grid, deliberately:

- **Tilt and magnetism are off.** They transform the element, which makes text blurry and shifts
  tables out from under the cursor. The grid still opts into them for KPI tiles.
- **No global spotlight element.** Each panel gets a pointer-following border glow and a low-alpha
  inner wash instead, which avoids stacking 800 px fixed overlays across ~90 panels.
- Clicks on `button`, `a`, `input`, `select`, `textarea` and `[role="button"]` don't ripple.

### Opting a panel out

Add `data-bento="off"` to the panel or any ancestor:

```tsx
<div data-bento="off" className="rounded-xl border border-line bg-surface">
  {/* no hover treatment */}
</div>
```

### Props

`MagicBento` keeps the upstream API — `textAutoHide`, `enableStars`, `enableSpotlight`,
`enableBorderGlow`, `disableAnimations`, `spotlightRadius`, `particleCount`, `enableTilt`,
`glowColor`, `clickEffect`, `enableMagnetism` — plus `cards`, `columns`, and `compact`.

`glowColor` is RGB channels without an `rgba()` wrapper. It defaults to ivory
(`242, 239, 230`), which reads on the dark canvas and degrades to a faint warm sheen on white.

### Notes

- Both components are **lazy-loaded**, so `gsap` (~200 kB) stays out of the main chunk. The
  dashboard `Suspense` fallback reserves the same height to avoid layout shift.
- Animations are skipped on viewports ≤768 px and when `prefers-reduced-motion: reduce` is set.
- Every particle and ripple node GSAP creates is removed on mouse-out and unmount.
- `overflow: hidden` is applied to auto-attached surfaces so particles clip to the panel. Native
  `<select>` menus and tooltips are not affected, but a custom popover rendered *inside* a panel
  would be clipped.

## Domain model

### Locations

| Type             | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `internal`       | Real stock, belongs to a warehouse       |
| `vendor`         | Source endpoint for receipts             |
| `customer`       | Destination endpoint for deliveries      |
| `inventory_loss` | Virtual sink for shrinkage from adjustments |

Only `internal` locations count toward on-hand totals.

### Documents

- **Types** — `receipt`, `delivery`, `internal`, `adjustment`
- **Statuses** — `draft` → `waiting` / `ready` → `done`, or `canceled`
- **References** — per-type sequence: `WH/IN/00001`, `WH/OUT/00001`, `WH/INT/00001`, `WH/ADJ/00001`

### Lifecycle

1. **Save draft** — editable while `draft`.
2. **Confirm** (`draft → ready`) — deliveries auto-drop to `waiting` if stock is short.
3. **Pick** (deliveries only) — blocked while short; clears a `waiting` order.
4. **Pack** (deliveries only) — requires `pickDone`.
5. **Validate** — the only step that moves stock, writing to `quants` and appending to `ledger`:
   - `receipt` → adds to destination
   - `delivery` / `internal` → subtracts from source, adds to destination
   - `adjustment` → posts the difference between counted and theoretical quantity, routing
     shrinkage to `inventory_loss`
6. **Cancel** — allowed any time before `done`.

## Resetting demo data

All client state lives under the `stocksense-v2` key:

```js
localStorage.removeItem('stocksense-v2')
location.reload()
```

## Known limitations

- `patchDoc` in `store.tsx` returns validation errors through a closure variable captured
  inside a `setState` updater, which React StrictMode may invoke more than once.
- `AuthFrame.tsx` exports both components and the `inputClass` const, so Vite's Fast Refresh
  cannot hot-reload it and falls back to a full reload. Harmless in dev.
- `ZonesPage.tsx` nests a `<button>` (the "Add Zone" button) inside the warehouse header `<button>`,
  which React flags as invalid DOM nesting.
- `AutoBentoSurfaces` sets `overflow: hidden` on matched panels; a custom popover rendered inside
  one would be clipped. Use `data-bento="off"` on that panel.
- The sidebar is a fixed `w-64` with no mobile drawer, so the layout is cramped below
  ~1024px.
- `App.css` and `assets/{react.svg,vite.svg}` are unused leftovers from the Vite starter.
- `npm audit` reports 4 advisories (esbuild dev server, react-router). Both need a
  major-version bump to clear.
- There is no test suite.
