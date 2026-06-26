import { Copy, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function SettingsPage() {
  const { user, profile, logout } = useAuth()
  const { household } = useHousehold()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

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
