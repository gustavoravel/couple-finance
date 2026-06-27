import { useState } from 'react'
import { Plus, Wallet, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { createAccount } from '@/services/accountService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/format'
import type { AccountType } from '@/types'

const accountTypes: Array<{ value: AccountType; label: string }> = [
  { value: 'checking', label: 'Conta corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'wallet', label: 'Carteira' },
  { value: 'investment', label: 'Investimento' },
  { value: 'emergency_reserve', label: 'Reserva de emergência' },
]

const accountColors = ['#7F3DFF', '#3B82F6', '#22C55E', '#F59E0B', '#EC4899', '#6366F1']

export function AccountsPage() {
  const { user } = useAuth()
  const { household, accounts } = useHousehold()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [initialBalance, setInitialBalance] = useState('0')
  const [emergencyTargetMonths, setEmergencyTargetMonths] = useState('6')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!household || !user || !name.trim()) return
    setLoading(true)
    const balance = parseFloat(initialBalance) || 0
    await createAccount(household.id, {
      name: name.trim(),
      type,
      initialBalance: balance,
      currentBalance: balance,
      includeInTotal: type !== 'emergency_reserve',
      ownerUid: 'shared',
      color: accountColors[accounts.length % accountColors.length],
      icon: 'wallet',
      archived: false,
      ...(type === 'emergency_reserve' && {
        emergencyTargetMonths: parseInt(emergencyTargetMonths, 10) || 6,
      }),
    })
    setName('')
    setInitialBalance('0')
    setShowForm(false)
    setLoading(false)
  }

  const totalBalance = accounts
    .filter((a) => a.includeInTotal && !a.archived)
    .reduce((s, a) => s + a.currentBalance, 0)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contas</h1>
          <p className="text-sm text-gray-500">Total: {formatCurrency(totalBalance)}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          Nova
        </Button>
      </header>

      {showForm && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Nova conta</h2>
          <div className="flex flex-col gap-3">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank" />
            <Select
              label="Tipo"
              options={accountTypes.map((t) => ({ value: t.value, label: t.label }))}
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
            />
            <Input
              label="Saldo inicial"
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />
            {type === 'emergency_reserve' && (
              <Input
                label="Meta (meses de despesa)"
                type="number"
                min="1"
                max="24"
                value={emergencyTargetMonths}
                onChange={(e) => setEmergencyTargetMonths(e.target.value)}
              />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button fullWidth onClick={handleCreate} disabled={loading || !name.trim()}>
                {loading ? 'Criando...' : 'Criar conta'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {accounts.length === 0 && !showForm && (
          <Card>
            <p className="text-center text-gray-400 py-8">Nenhuma conta cadastrada</p>
          </Card>
        )}
        {accounts.map((account) => (
          <Card key={account.id} padding="sm" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${account.color}20`, color: account.color }}
            >
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{account.name}</p>
              <p className="text-xs text-gray-400">
                {accountTypes.find((t) => t.value === account.type)?.label}
                {account.type === 'emergency_reserve' && account.emergencyTargetMonths && (
                  <> · Meta {account.emergencyTargetMonths} meses</>
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              {account.type === 'emergency_reserve' && (
                <Shield className="w-4 h-4 text-amber-500 ml-auto mb-0.5" />
              )}
              <p className={`font-semibold ${account.currentBalance >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                {formatCurrency(account.currentBalance)}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
