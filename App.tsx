import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { GuestOnly, RequireAuth } from './components/AppShell'
import { OperationForm, OperationList } from './components/Operations'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { ProductFormPage, ProductsPage } from './pages/ProductsPage'
import { ProfilePage } from './pages/ProfilePage'
import { SignupPage } from './pages/SignupPage'
import { WarehousesPage } from './pages/WarehousesPage'
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
            <Route path="/settings/warehouses" element={<WarehousesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
