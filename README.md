# StockSense IMS

A modern, enterprise-ready **inventory management system** — an Odoo-inspired "Inventory OS" covering inventory core, warehouse operations, sales, purchasing, returns, enterprise administration, and deep intelligence reporting. Stock is modelled the way Odoo does it: a set of *quants* (product × location quantities) fed by *documents* and recorded in an append-only, tamper-evident *stock ledger*.

The UI features a bespoke **ivory & black** aesthetic with full **dark mode**, interactive **MagicBento** surfaces, tree-folded **BranchedMenu** navigation, and a WebGL shader backdrop.

---

## Technology Stack

| Concern         | Choice                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| **Frontend**    | React 18, TypeScript 5.6, Vite 5                                       |
| **Styling**     | Tailwind CSS 3 (PostCSS + autoprefixer) + semantic CSS variables       |
| **Navigation**  | `react-router-dom` 6 with route-level and action-level permission guards |
| **Motion & 3D** | `three.js` (WebGL `ShapeBlur` backdrop), `gsap` (`MagicBento` surfaces)|
| **Icons**       | `lucide-react`, `@hugeicons/react`                                     |
| **Backend API** | Express 5 (`server.js`) on port 5000                                   |
| **Mailing**     | `nodemailer` — OTP password resets with live SMTP relay                |
| **State & Data**| React Context (`StoreProvider`) + `localStorage` (`stocksense-v4`)    |

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Development Server

```bash
npm run dev
```

`npm run dev` concurrently launches both processes:

| Process | Service              | URL                     |
| ------- | -------------------- | ----------------------- |
| `api`   | `node server.js`     | `http://localhost:5000` |
| `app`   | `vite --host 0.0.0.0`| `http://localhost:5173` |

Vite automatically proxies `/api` requests to `http://localhost:5000`.

### 3. Build & Preview

```bash
npm run build      # tsc -b type-check + production bundle
npm run preview    # Serve production dist locally
```

---

## Demo Accounts & Role Permissions

The system includes pre-seeded accounts configured for each role:

| Role                   | Demo Email                 | Password    | Primary Permissions & Access Scope |
| ---------------------- | -------------------------- | ----------- | ---------------------------------- |
| **Admin**              | `admin@stocksense.io`       | `Admin@123` | Complete root access: users, audit, settings, operations, approvals. |
| **Inventory Manager**  | `demo@stocksense.app`       | `Demo@123`  | Catalog, stock valuation, adjustments, transfers, and inventory approvals. |
| **Warehouse Staff**    | `staff@stocksense.io`       | `Staff@123` | Receipts, delivery picks/packs, cycle counts, putaway rules. |
| **Purchasing Manager** | `purchasing@stocksense.io`  | `Purch@123` | Vendors, purchase orders, PO approvals, purchasing reports. |
| **Sales Manager**      | `sales@stocksense.io`       | `Sales@123` | Customers, sales orders, stock reservations, sales reports. |
| **Auditor**            | `auditor@stocksense.io`     | `Audit@123` | Read-only compliance: immutable audit logs, reports export, stock ledger. |

---

## System Architecture & Modules

### 1. Real Role-Based Access Control (RBAC)
- **Granular Permissions**: 20 permissions covering all functional domains (`dashboard.view`, `products.view/create/edit/delete`, `inventory.adjust/approve`, `warehouse.manage`, `purchasing.view/create/approve`, `sales.view/create/approve`, `returns.manage`, `reports.view/export`, `users.manage`, `settings.manage`, `audit.view`).
- **Enforcement Layers**:
  - Store-level action guards: mutating store actions validate permissions through `can(permission)`.
  - Route-level guards: `<RequirePermission permission="...">` blocks unauthorized routes.
  - UI navigation adaptation: sidebar links automatically adapt to role clearance.

### 2. User Management (`/settings/users`)
- Administrator user directory displaying role, active/inactive state, phone, last login, and creation date.
- Operations: Create new team members, edit metadata, activate/deactivate accounts, assign roles, and trigger secure password resets.
- Passwords use SHA-256 cryptographic hashing and are never exposed in the UI.

### 3. Immutable Compliance Audit Trail (`/audit-log`)
- Complete tamper-evident audit record capturing:
  - Timestamp, user name, email, and role
  - Action: `CREATE`, `UPDATE`, `DELETE`, `CONFIRM`, `PICK`, `PACK`, `VALIDATE`, `CANCEL`, `LOGIN`, `LOGOUT`, `APPROVE`, `REJECT`
  - Target entity, entity ID, and document number
  - Old values, new values, and contextual metadata
- Multi-filter search suite: query keyword, user, action type, entity category, and date range.
- Records are strictly immutable and cannot be altered or removed from the UI.

### 4. Approval Workflows & Threshold Governance
- Configurable approval policy:
  - **Purchase Orders**: Orders exceeding the threshold require Purchasing Manager or Admin approval before release to vendors.
  - **Inventory Adjustments**: Variances exceeding financial threshold require Inventory Manager approval before posting to the ledger.
  - **Returns**: High-value returns require approval.
- Workflow Stages: `Draft` &rarr; `Submitted` &rarr; `Pending Approval` &rarr; `Approved / Rejected` &rarr; `Posted`.
- Stores approver identity, timestamp, and review commentary.

### 5. Notification Center & Alerts Engine (`/notifications`)
- Header notification bell with unread badge and quick-view popover dropdown.
- Full notification center with category filters, "Mark Read", "Mark All as Read", and direct navigation links.
- Automated alert rules:
  - `LOW_STOCK` & `OUT_OF_STOCK`: Stock below replenishment threshold.
  - `PO_OVERDUE`: Purchase orders past promised delivery date.
  - `CYCLE_COUNT`: Scheduled warehouse verifications.
  - `APPROVAL_REQUIRED`: High-value operations awaiting manager clearance.
- Intelligent deduplication engine prevents alert spamming.

### 6. Enterprise Reports Suite (27 Reports) (`/reports`)
The reporting suite delivers 27 specialized audit reports grouped into 4 domains:

#### Inventory Domain (11 Reports)
1. **Current Stock On Hand**: Real-time stock on hand, allocated, and free available quantities.
2. **Inventory by Warehouse**: Stock distribution, SKU depth, and valuation across facilities.
3. **Inventory by Location / Bin**: Bin-level quant breakdown across internal racks.
4. **Inventory Valuation**: Weighted Average Cost (WAC) valuation ledger.
5. **Stock Movement Audit**: Chronological log of receipts, deliveries, and adjustments.
6. **Stock Aging Analysis**: Aging buckets (<30d, 31-60d, 61-90d, 90d+) to detect stagnant capital.
7. **Dead Stock Report**: Zero outbound movement over the past 90+ days.
8. **Slow Moving Items**: Low velocity items with turnover < 1.0.
9. **Fast Moving Items (Runners)**: High turnover items with rapid demand.
10. **Stock Turnover Ratio**: Inventory velocity metric (COGS / Average Inventory).
11. **Stock Variance & Discrepancies**: Cycle count discrepancy analysis.

#### Purchasing Domain (5 Reports)
12. **Purchase Orders Summary**: Procurement orders, totals, and fulfillment status.
13. **Vendor Scorecard & Performance**: On-time delivery rate, fulfillment accuracy, and lead times.
14. **Purchase Spend Analysis**: Expenditures by supplier, category, and date period.
15. **Overdue Purchase Orders**: POs exceeding vendor delivery promises.
16. **Purchase Receipts Log**: Receiving dock transactions against purchase orders.

#### Sales Domain (6 Reports)
17. **Sales Orders Master**: Orders across Draft, Confirmed, Reserved, and Shipped stages.
18. **Customer Sales Summary**: Total revenue, order count, and gross order values.
19. **Product Sales & Margin**: Units sold, gross sales revenue, COGS, and profit margin.
20. **Fulfillment & OTIF**: Line fulfillment rate and on-time in-full performance.
21. **Backorders & Shortages**: Customer orders waiting on stock replenishment.
22. **Returns & RMA Analysis**: Customer return reasons, inspection dispositions, and refunds.

#### Warehouse Operations Domain (5 Reports)
23. **Picking Performance**: Wave/batch picking orders, completion times, and picker stats.
24. **Receiving Dock Performance**: Dock turnaround and receiving verification.
25. **Packing & Cartonizing**: Package carton counts, dispatch weights, and containers.
26. **Cycle Count Audit**: Scheduled cycle counts, blind verifications, and adjustments.
27. **Warehouse Capacity Utilization**: Storage density, zones, and capacity utilization.

#### Report Builder Features
- **Multi-Dimensional Filters**: Date range, warehouse, location, category, product, vendor, customer, and status.
- **Dynamic Grouping**: Group rows by warehouse, category, or status.
- **Totals Calculation**: Automatic summation of quantities, valuation, revenue, and spend.
- **Saved Presets**: Save and reload custom filter configurations in `localStorage`.
- **Instant Exports**: One-click **CSV**, **JSON**, and print-friendly export.

### 7. Global Search Modal (`Ctrl+K` / `⌘+K`)
- Omnipresent command palette accessible from anywhere via `Ctrl+K`.
- Searches across Products, SKUs, Purchase Orders, Sales Orders, Operations, Customers, Vendors, and Warehouses.
- Categorized result listing with keyboard navigation (`↑`/`↓` and `Enter`).

### 8. Printable Business Documents
- Printable layouts with clean typography, company header, line item tables, financial totals, and dual sign-off signature blocks:
  - Purchase Orders
  - Sales Orders
  - Goods Receipt Notes (GRN)
  - Delivery Order Slips
  - Internal Stock Transfers
  - Return Notes & RMA Dispositions
  - Inventory Adjustment Vouchers

### 9. Activity Timeline Component
- Chronological event timeline attached to POs, SOs, Operations, and Returns.
- Visualizes lifecycle progression (`Draft` &rarr; `Approved` &rarr; `Partially Received` &rarr; `Fully Received`).

### 10. Multi-Tab System Settings (`/settings`)
- **Company Profile**: Legal company name, tax ID, currency, email, phone, and address.
- **Inventory Policies**: Default warehouse, negative stock policy, lot & serial tracking toggles, valuation method (WAC / FIFO).
- **Numbering Sequences**: Configurable prefix and auto-incrementing document sequences.
- **Approval Thresholds**: Value limits for PO approvals, adjustment variances, and returns.
- **Alert Rules**: Stockout warning days, expiry alert thresholds, and variance triggers.

---

## Project Structure

```
index.html                     Entry HTML with theme initialization script
main.tsx                       Application bootstrapper
App.tsx                        Route definitions with RBAC route-level guards
store.tsx                      StoreProvider: global state, mutations, localStorage sync
types.ts                       Complete domain model (quants, ledger, documents, users, audit...)
server.js                      Express API server (SMTP relay & OTP delivery)
index.css                      Tailwind entry + CSS color tokens (light & dark mode)
tailwind.config.js             Semantic token bindings
vite.config.ts                 Vite bundler configuration & /api proxy

components/
  AppShell.tsx                 Sidebar with BranchedMenu, header, Ctrl+K search, notifications
  RequirePermission.tsx        Route and component-level RBAC authorization wrappers
  NotificationBell.tsx         Header bell with unread count badge & dropdown menu
  GlobalSearchModal.tsx        Ctrl+K categorized omni-search modal
  PrintableDocument.tsx        Print layout component with company branding & signatures
  ActivityTimeline.tsx         Record event audit history component
  ConfirmDialog.tsx            Destructive action confirmation modal
  Toast.tsx                    Toast notifications provider (`useToast`)
  Operations.tsx               OperationList & OperationForm for receipts/deliveries/transfers
  AutoBentoSurfaces.tsx        Automatic MagicBento hover treatment for cards & panels
  MagicBento.tsx               Interactive bento card grid
  BranchedMenu.tsx             Tree-folded sidebar navigation menu
  ShapeBlur.tsx                Three.js WebGL shader background
  AuthFrame.tsx                Authentication split-screen layout
  Badges.tsx                   Status badges & pills
  ThemeToggle.tsx              Light / Dark theme toggle button

lib/
  rbac.ts                      Role-permission matrix and authorization guard functions
  export.ts                    Reusable CSV, JSON, and print export utilities
  notifications.ts             Notification evaluation & deduplication engine
  inventory.ts                 Stock calculations, valuations, and intelligence metrics
  seed.ts                      Complete demo dataset (users, warehouses, products, POs, SOs...)
  utils.ts                     Cryptographic helpers, formatting, and unique ID generators

pages/
  DashboardPage.tsx            Executive KPI overview with 3D/Bento widgets
  ProductsPage.tsx             Product catalog & master inventory list
  UsersPage.tsx                Admin user management & role assignment
  AuditLogPage.tsx             Immutable compliance audit log
  NotificationsPage.tsx        Notification center with filtering & action links
  ReportsPage.tsx              Enterprise 27-report suite with dynamic Report Builder
  SettingsPage.tsx             Multi-tab system settings & configuration suite
  PurchaseOrdersPage.tsx       Purchase order procurement list
  PurchaseOrderDetailPage.tsx  PO detail with approvals, printable document, timeline
  SalesOrdersPage.tsx          Sales order list
  SalesOrderDetailPage.tsx     SO detail with stock reservation matrix, print, timeline
  ReturnsPage.tsx              Returns and RMA tracking
  ReturnDetailPage.tsx         Return inspection disposition & printable note
  WarehouseDashboardPage.tsx   Warehouse operational center
  WarehousesPage.tsx           Warehouse facilities management
  ZonesPage.tsx                Warehouse zones and bin locations
  CycleCountsPage.tsx          Cycle count schedules and discrepancy verifications
  PickingPage.tsx              Warehouse order picking operations
  PackingPage.tsx              Cartonizing and package container packing
  ShippingPage.tsx             Outbound dispatch and shipping carrier tracking
  VariantsPage.tsx             Product attribute matrix and variant management
  LotsPage.tsx                 Batch & lot traceability
  SerialsPage.tsx              Individual serial number tracking & lifecycle
  PutawayPage.tsx              Automated warehouse putaway routing rules
  ValuationPage.tsx            Stock valuation breakdown
  IntelligencePage.tsx         Dead stock, stockout risk, and reorder intelligence
  CustomersPage.tsx            Customer accounts directory
  VendorsPage.tsx              Supplier directory & scorecard
  LoginPage.tsx                Authentication login
  SignupPage.tsx               User registration
  ForgotPasswordPage.tsx       Email OTP password reset
  ProfilePage.tsx              User profile view & password update
```

---

## Resetting Demo Data

All client state is persisted under the `stocksense-v4` key with automatic backward-compatibility migration:

```js
// In browser developer console:
localStorage.removeItem('stocksense-v4');
location.reload();
```

---

## License

Private repository — StockSense IMS.
