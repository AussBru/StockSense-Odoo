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
| 3D / visual | three.js — the `ShapeBlur` WebGL backdrop           |
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
- The sidebar is a fixed `w-64` with no mobile drawer, so the layout is cramped below
  ~1024px.
- `App.css` and `assets/{react.svg,vite.svg}` are unused leftovers from the Vite starter.
- `npm audit` reports 4 advisories (esbuild dev server, react-router). Both need a
  major-version bump to clear.
- There is no test suite.
