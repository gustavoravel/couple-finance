import { Bell, ChevronRight, Copy, FileBarChart, LogOut, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { upsertUserProfile } from '@/services/householdService'
import { requestNotificationPermission } from '@/hooks/useDueReminders'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'

export function SettingsPage() {
  const { user, profile, logout, refreshProfile } = useAuth()
  const { household } = useHousehold()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)

  const notificationsEnabled = profile?.preferences?.notificationsEnabled ?? false
  const reminderDays = profile?.preferences?.reminderDaysBefore ?? 3

  const handleCopyInvite = async () => {
    if (!household?.inviteCode) return
    await navigator.clipboard.writeText(household.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const updatePreferences = async (prefs: NonNullable<typeof profile>['preferences']) => {
    if (!user) return
    await upsertUserProfile(user.uid, {
      preferences: { ...profile?.preferences, ...prefs },
    })
    await refreshProfile()
  }

  const handleToggleNotifications = async () => {
    if (!user) return
    setNotifLoading(true)
    try {
      if (!notificationsEnabled) {
        const granted = await requestNotificationPermission()
        if (!granted) return
        await updatePreferences({ notificationsEnabled: true, reminderDaysBefore: reminderDays })
      } else {
        await updatePreferences({ notificationsEnabled: false })
      }
    } finally {
      setNotifLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Ajustes</h1>
      </header>

      <Card>
        <h2 className="font-semibold text-gray-900 mb-3">Perfil</h2>
        <p className="text-gray-700">{profile?.displayName || user?.displayName}</p>
        <p className="text-sm text-gray-400">{profile?.email || user?.email}</p>
      </Card>

      <Card>
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notificações
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          Lembretes de vencimento de faturas de cartão (notificação do navegador).
        </p>
        <Button
          variant={notificationsEnabled ? 'outline' : 'primary'}
          fullWidth
          onClick={handleToggleNotifications}
          disabled={notifLoading}
        >
          {notifLoading
            ? 'Aguarde...'
            : notificationsEnabled
              ? 'Desativar lembretes'
              : 'Ativar lembretes'}
        </Button>
        {notificationsEnabled && (
          <Select
            label="Avisar com antecedência"
            className="mt-3"
            options={[
              { value: '1', label: '1 dia antes' },
              { value: '3', label: '3 dias antes' },
              { value: '5', label: '5 dias antes' },
              { value: '7', label: '7 dias antes' },
            ]}
            value={String(reminderDays)}
            onChange={(e) => updatePreferences({ reminderDaysBefore: Number(e.target.value) })}
          />
        )}
      </Card>

      <Link to="/recorrencias">
        <Card padding="sm" className="flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Recorrências</p>
            <p className="text-xs text-gray-400">Salários, contas fixas e lançamentos automáticos</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Card>
      </Link>

      <Link to="/relatorios">
        <Card padding="sm" className="flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
            <FileBarChart className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Relatórios</p>
            <p className="text-xs text-gray-400">Exportar CSV/PDF e importar planilha</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Card>
      </Link>

      {household && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-1">{household.name}</h2>
          <p className="text-sm text-gray-400 mb-4">
            {household.members.length} membro{household.members.length !== 1 ? 's' : ''}
          </p>

          {household.members.length < 2 && (
            <div className="bg-primary-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-2">Convide seu parceiro(a) com o código:</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-widest text-primary">
                  {household.inviteCode}
                </span>
                <button
                  onClick={handleCopyInvite}
                  className="p-2 rounded-lg hover:bg-primary-100 transition-colors text-primary"
                  aria-label="Copiar código"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              {copied && <p className="text-xs text-green-600 mt-2">Código copiado!</p>}
            </div>
          )}
        </Card>
      )}

      <Button variant="outline" onClick={handleLogout} className="text-red-500 border-red-200 hover:bg-red-50">
        <LogOut className="w-4 h-4" />
        Sair da conta
      </Button>
    </div>
  )
}
