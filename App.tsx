import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { GuestOnly, RequireAuth } from './components/AppShell'
import { OperationForm, OperationList } from './components/Operations'
import { CustomerFormPage } from './pages/CustomerFormPage'
import { CustomersPage } from './pages/CustomersPage'
import { CycleCountsPage } from './pages/CycleCountsPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HistoryPage } from './pages/HistoryPage'
import { IntelligencePage } from './pages/IntelligencePage'
import { LoginPage } from './pages/LoginPage'
import { LotsPage } from './pages/LotsPage'
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
import { ShippingPage } from './pages/ShippingPage'
import { SignupPage } from './pages/SignupPage'
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
      <BrowserRouter>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
          <Route element={<RequireAuth />}>
            {/* Inventory Core */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductFormRoute />} />
            <Route path="/receipts" element={<OperationList type="receipt" />} />
            <Route path="/receipts/:id" element={<DocRoute type="receipt" />} />
            <Route path="/deliveries" element={<OperationList type="delivery" />} />
            <Route path="/deliveries/:id" element={<DocRoute type="delivery" />} />
            <Route path="/transfers" element={<OperationList type="internal" />} />
            <Route path="/transfers/:id" element={<DocRoute type="internal" />} />
            <Route path="/adjustments" element={<OperationList type="adjustment" />} />
            <Route path="/adjustments/:id" element={<DocRoute type="adjustment" />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/intelligence" element={<IntelligencePage />} />
            <Route path="/valuation" element={<ValuationPage />} />

            {/* Sales */}
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/new" element={<CustomerFormPage />} />
            <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
            <Route path="/sales-orders" element={<SalesOrdersPage />} />
            <Route path="/sales-orders/new" element={<SalesOrderFormPage />} />
            <Route path="/sales-orders/:id" element={<SalesOrderDetailPage />} />
            <Route path="/sales-orders/:id/edit" element={<SalesOrderFormPage />} />

            {/* Purchasing */}
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/vendors/new" element={<VendorFormPage />} />
            <Route path="/vendors/:id" element={<VendorDetailPage />} />
            <Route path="/vendors/:id/edit" element={<VendorFormPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
            <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
            <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />

            {/* Returns */}
            <Route path="/returns" element={<ReturnsPage />} />
            <Route path="/returns/new" element={<ReturnFormPage />} />
            <Route path="/returns/:id" element={<ReturnDetailPage />} />

            {/* Reports */}
            <Route path="/reports" element={<ReportsPage />} />

            {/* Settings & Profile */}
            <Route path="/settings/warehouses" element={<WarehousesPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Warehouse Operations Addon */}
            <Route path="/warehouse-dashboard" element={<WarehouseDashboardPage />} />
            <Route path="/variants" element={<VariantsPage />} />
            <Route path="/lots" element={<LotsPage />} />
            <Route path="/serials" element={<SerialsPage />} />
            <Route path="/picking" element={<PickingPage />} />
            <Route path="/packing" element={<PackingPage />} />
            <Route path="/shipping" element={<ShippingPage />} />
            <Route path="/cycle-counts" element={<CycleCountsPage />} />
            <Route path="/zones" element={<ZonesPage />} />
            <Route path="/putaway" element={<PutawayPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
