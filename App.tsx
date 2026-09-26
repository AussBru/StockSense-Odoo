import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { GuestOnly, RequireAuth } from './components/AppShell'
import { OperationForm, OperationList } from './components/Operations'
import { RequirePermission } from './components/RequirePermission'
import { ToastProvider } from './components/Toast'
import { CustomerFormPage } from './pages/CustomerFormPage'
import { CustomersPage } from './pages/CustomersPage'
import { CycleCountsPage } from './pages/CycleCountsPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HistoryPage } from './pages/HistoryPage'
import { IntelligencePage } from './pages/IntelligencePage'
import { LoginPage } from './pages/LoginPage'
import { LotsPage } from './pages/LotsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PackingPage } from './pages/PackingPage'
import { PickingPage } from './pages/PickingPage'
import { ProductFormPage, ProductsPage } from './pages/ProductsPage'
import { ProfilePage } from './pages/ProfilePage'
import { PurchaseOrderDetailPage } from './pages/PurchaseOrderDetailPage'
import { PurchaseOrderFormPage } from './pages/PurchaseOrderFormPage'
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage'
import { PutawayPage } from './pages/PutawayPage'
import { ReportsPage } from './pages/ReportsPage'
import { ReturnDetailPage } from './pages/ReturnDetailPage'
import { ReturnFormPage } from './pages/ReturnFormPage'
import { ReturnsPage } from './pages/ReturnsPage'
import { SalesOrderDetailPage } from './pages/SalesOrderDetailPage'
import { SalesOrderFormPage } from './pages/SalesOrderFormPage'
import { SalesOrdersPage } from './pages/SalesOrdersPage'
import { SerialsPage } from './pages/SerialsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ShippingPage } from './pages/ShippingPage'
import { SignupPage } from './pages/SignupPage'
import { UsersPage } from './pages/UsersPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { ValuationPage } from './pages/ValuationPage'
import { VariantsPage } from './pages/VariantsPage'
import { VendorDetailPage } from './pages/VendorDetailPage'
import { VendorFormPage } from './pages/VendorFormPage'
import { VendorsPage } from './pages/VendorsPage'
import { WarehouseDashboardPage } from './pages/WarehouseDashboardPage'
import { WarehousesPage } from './pages/WarehousesPage'
import { ZonesPage } from './pages/ZonesPage'
import { StoreProvider } from './store'
import type { DocType } from './types'

function ProductFormRoute() {
  const { id } = useParams()
  return <ProductFormPage key={id} />
}

function DocRoute({ type }: { type: DocType }) {
  const { id } = useParams()
  return <OperationForm key={`${type}-${id}`} type={type} />
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<GuestOnly />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            <Route element={<RequireAuth />}>
              {/* Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <RequirePermission permission="dashboard.view">
                    <DashboardPage />
                  </RequirePermission>
                }
              />

              {/* Products */}
              <Route
                path="/products"
                element={
                  <RequirePermission permission="products.view">
                    <ProductsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/products/:id"
                element={
                  <RequirePermission permission="products.view">
                    <ProductFormRoute />
                  </RequirePermission>
                }
              />

              {/* Operations & Inventory Move Documents */}
              <Route
                path="/receipts"
                element={
                  <RequirePermission permission="inventory.adjust">
                    <OperationList type="receipt" />
                  </RequirePermission>
                }
              />
              <Route
                path="/receipts/:id"
                element={
                  <RequirePermission permission="inventory.adjust">
                    <DocRoute type="receipt" />
                  </RequirePermission>
                }
              />
              <Route
                path="/deliveries"
                element={
                  <RequirePermission permission="inventory.adjust">
                    <OperationList type="delivery" />
                  </RequirePermission>
                }
              />
              <Route
                path="/deliveries/:id"
                element={
                  <RequirePermission permission="inventory.adjust">
                    <DocRoute type="delivery" />
                  </RequirePermission>
                }
              />
              <Route
                path="/transfers"
                element={
                  <RequirePermission permission="inventory.adjust">
                    <OperationList type="internal" />
                  </RequirePermission>
                }
              />
              <Route
                path="/transfers/:id"
                element={
                  <RequirePermission permission="inventory.adjust">
                    <DocRoute type="internal" />
                  </RequirePermission>
                }
              />
              <Route
                path="/adjustments"
                element={
                  <RequirePermission permission="inventory.adjust">
                    <OperationList type="adjustment" />
                  </RequirePermission>
                }
              />
              <Route
                path="/adjustments/:id"
                element={
                  <RequirePermission permission="inventory.adjust">
                    <DocRoute type="adjustment" />
                  </RequirePermission>
                }
              />

              <Route
                path="/history"
                element={
                  <RequirePermission permission="inventory.adjust">
                    <HistoryPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/intelligence"
                element={
                  <RequirePermission permission="dashboard.view">
                    <IntelligencePage />
                  </RequirePermission>
                }
              />
              <Route
                path="/valuation"
                element={
                  <RequirePermission permission="reports.view">
                    <ValuationPage />
                  </RequirePermission>
                }
              />

              {/* Sales Module */}
              <Route
                path="/customers"
                element={
                  <RequirePermission permission="sales.view">
                    <CustomersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/customers/new"
                element={
                  <RequirePermission permission="sales.create">
                    <CustomerFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/customers/:id/edit"
                element={
                  <RequirePermission permission="sales.create">
                    <CustomerFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/sales-orders"
                element={
                  <RequirePermission permission="sales.view">
                    <SalesOrdersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/sales-orders/new"
                element={
                  <RequirePermission permission="sales.create">
                    <SalesOrderFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/sales-orders/:id"
                element={
                  <RequirePermission permission="sales.view">
                    <SalesOrderDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/sales-orders/:id/edit"
                element={
                  <RequirePermission permission="sales.create">
                    <SalesOrderFormPage />
                  </RequirePermission>
                }
              />

              {/* Purchasing Module */}
              <Route
                path="/vendors"
                element={
                  <RequirePermission permission="purchasing.view">
                    <VendorsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/vendors/new"
                element={
                  <RequirePermission permission="purchasing.create">
                    <VendorFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/vendors/:id"
                element={
                  <RequirePermission permission="purchasing.view">
                    <VendorDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/vendors/:id/edit"
                element={
                  <RequirePermission permission="purchasing.create">
                    <VendorFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/purchase-orders"
                element={
                  <RequirePermission permission="purchasing.view">
                    <PurchaseOrdersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/purchase-orders/new"
                element={
                  <RequirePermission permission="purchasing.create">
                    <PurchaseOrderFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/purchase-orders/:id"
                element={
                  <RequirePermission permission="purchasing.view">
                    <PurchaseOrderDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/purchase-orders/:id/edit"
                element={
                  <RequirePermission permission="purchasing.create">
                    <PurchaseOrderFormPage />
                  </RequirePermission>
                }
              />

              {/* Returns Module */}
              <Route
                path="/returns"
                element={
                  <RequirePermission permission="returns.manage">
                    <ReturnsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/returns/new"
                element={
                  <RequirePermission permission="returns.manage">
                    <ReturnFormPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/returns/:id"
                element={
                  <RequirePermission permission="returns.manage">
                    <ReturnDetailPage />
                  </RequirePermission>
                }
              />

              {/* Reports Suite */}
              <Route
                path="/reports"
                element={
                  <RequirePermission permission="reports.view">
                    <ReportsPage />
                  </RequirePermission>
                }
              />

              {/* Notifications Center */}
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Administration & Security */}
              <Route
                path="/settings/users"
                element={
                  <RequirePermission permission="users.manage">
                    <UsersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/audit-log"
                element={
                  <RequirePermission permission="audit.view">
                    <AuditLogPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequirePermission permission="settings.manage">
                    <SettingsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/settings/warehouses"
                element={
                  <RequirePermission permission="warehouse.manage">
                    <WarehousesPage />
                  </RequirePermission>
                }
              />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Warehouse Operations Addon */}
              <Route
                path="/warehouse-dashboard"
                element={
                  <RequirePermission permission="warehouse.manage">
                    <WarehouseDashboardPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/variants"
                element={
                  <RequirePermission permission="warehouse.manage">
                    <VariantsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/lots"
                element={
                  <RequirePermission permission="warehouse.manage">
                    <LotsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/serials"
                element={
                  <RequirePermission permission="warehouse.manage">
                    <SerialsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/picking"
                element={
                  <RequirePermission permission="warehouse.manage">
                    <PickingPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/packing"
                element={
                  <RequirePermission permission="warehouse.manage">
                    <PackingPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/shipping"
                element={
                  <RequirePermission permission="warehouse.manage">
                    <ShippingPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/cycle-counts"
                element={
                  <RequirePermission permission="warehouse.manage">
                    <CycleCountsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/zones"
                element={
                  <RequirePermission permission="warehouse.manage">
                    <ZonesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/putaway"
                element={
                  <RequirePermission permission="warehouse.manage">
                    <PutawayPage />
                  </RequirePermission>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  )
}
