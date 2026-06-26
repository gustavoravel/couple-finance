import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createHousehold, joinHousehold } from '@/services/householdService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

type Mode = 'choose' | 'create' | 'join'

export function HouseholdSetupPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState<Mode>('choose')
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!user || !householdName.trim()) return
    setError('')
    setLoading(true)
    try {
      await createHousehold(user.uid, householdName.trim())
      window.location.href = '/'
    } catch {
      setError('Erro ao criar o lar')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!user || !inviteCode.trim()) return
    setError('')
    setLoading(true)
    try {
      await joinHousehold(user.uid, inviteCode.trim())
      window.location.href = '/'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao entrar no lar')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col gap-4">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Configure seu lar</h1>
            <p className="text-gray-500 mt-1">Crie um novo lar ou entre com o código do parceiro(a)</p>
          </div>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setMode('create')}>
            <h2 className="font-semibold text-gray-900">Criar novo lar</h2>
            <p className="text-sm text-gray-500 mt-1">Você receberá um código para convidar seu parceiro(a)</p>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setMode('join')}>
            <h2 className="font-semibold text-gray-900">Entrar com código</h2>
            <p className="text-sm text-gray-500 mt-1">Use o código que seu parceiro(a) compartilhou</p>
          </Card>
        </div>
      </div>
    )
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <h1 className="text-xl font-bold text-gray-900 mb-4">Nome do lar</h1>
            <Input
              label="Ex.: Casa do João & Maria"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="Nome do lar"
            />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={() => setMode('choose')}>Voltar</Button>
              <Button fullWidth onClick={handleCreate} disabled={loading || !householdName.trim()}>
                {loading ? 'Criando...' : 'Criar lar'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Código de convite</h1>
          <Input
            label="Código de 6 caracteres"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
          />
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          <div className="flex gap-3 mt-6">
            <Button variant="ghost" onClick={() => setMode('choose')}>Voltar</Button>
            <Button fullWidth onClick={handleJoin} disabled={loading || inviteCode.length < 6}>
              {loading ? 'Entrando...' : 'Entrar no lar'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
