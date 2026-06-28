import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { HouseholdProvider } from '@/contexts/HouseholdContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { HouseholdSetupPage } from '@/pages/onboarding/HouseholdSetupPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { NewTransactionPage } from '@/pages/NewTransactionPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { MonthlyPanelPage } from '@/pages/MonthlyPanelPage'
import { CardsPage } from '@/pages/CardsPage'
import { CardDetailPage } from '@/pages/CardDetailPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { RecurrencesPage } from '@/pages/RecurrencesPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!profile?.householdId) return <Navigate to="/configurar-lar" replace />

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (user && profile?.householdId) return <Navigate to="/" replace />
  if (user && !profile?.householdId) return <Navigate to="/configurar-lar" replace />

  return <>{children}</>
}

function SetupRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.householdId) return <Navigate to="/" replace />

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HouseholdProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/cadastro" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/configurar-lar" element={<SetupRoute><HouseholdSetupPage /></SetupRoute>} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="lancamentos" element={<TransactionsPage />} />
              <Route path="novo" element={<NewTransactionPage />} />
              <Route path="contas" element={<AccountsPage />} />
              <Route path="cartoes" element={<CardsPage />} />
              <Route path="cartoes/:cardId" element={<CardDetailPage />} />
              <Route path="painel" element={<MonthlyPanelPage />} />
              <Route path="metas" element={<GoalsPage />} />
              <Route path="recorrencias" element={<RecurrencesPage />} />
              <Route path="relatorios" element={<ReportsPage />} />
              <Route path="ajustes" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HouseholdProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
