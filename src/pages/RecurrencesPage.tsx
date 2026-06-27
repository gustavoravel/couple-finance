import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { createRecurrence, deleteRecurrence, updateRecurrence } from '@/services/recurrenceService'
import { frequencyLabels, initialNextRunDate, weekDayLabels } from '@/lib/recurrenceUtils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/format'
import type { RecurrenceFrequency, TransactionType } from '@/types'

export function RecurrencesPage() {
  const { user } = useAuth()
  const { household, accounts, categories, recurrences } = useHousehold()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState(String(new Date().getDate()))
  const [dayOfWeek, setDayOfWeek] = useState(String(new Date().getDay()))
  const [status, setStatus] = useState<'paid' | 'pending'>('paid')

  const filteredCategories = categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense'))

  const handleCreate = async () => {
    if (!household || !user || !name.trim() || !amount || !categoryId || !accountId) return
    setLoading(true)

    const dayMonth = parseInt(dayOfMonth, 10)
    const dayWeek = parseInt(dayOfWeek, 10)
    const nextRunDate = initialNextRunDate(
      frequency,
      frequency !== 'weekly' ? dayMonth : undefined,
      frequency === 'weekly' ? dayWeek : undefined,
    )

    await createRecurrence(household.id, {
      template: {
        type,
        amount: parseFloat(amount),
        categoryId,
        description: name.trim(),
        paymentMethod: 'account',
        accountId,
        status,
      },
      frequency,
      dayOfMonth: frequency !== 'weekly' ? dayMonth : undefined,
      dayOfWeek: frequency === 'weekly' ? dayWeek : undefined,
      nextRunDate,
      active: true,
      createdBy: user.uid,
    })

    setName('')
    setAmount('')
    setCategoryId('')
    setShowForm(false)
    setLoading(false)
  }

  const toggleActive = async (id: string, active: boolean) => {
    if (!household) return
    await updateRecurrence(household.id, id, { active: !active })
  }

  const scheduleLabel = (rec: (typeof recurrences)[0]) => {
    if (rec.frequency === 'weekly' && rec.dayOfWeek !== undefined) {
      return `${frequencyLabels.weekly} · ${weekDayLabels[rec.dayOfWeek]}`
    }
    if (rec.dayOfMonth) {
      return `${frequencyLabels[rec.frequency]} · dia ${rec.dayOfMonth}`
    }
    return frequencyLabels[rec.frequency]
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recorrências</h1>
          <p className="text-sm text-gray-500">Salários, contas fixas e lançamentos automáticos</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          Nova
        </Button>
      </header>

      <Card padding="sm" className="bg-primary-50 border-primary-100">
        <p className="text-sm text-gray-600">
          Lançamentos pendentes são gerados automaticamente ao abrir o app quando a data programada chega.
        </p>
      </Card>

      {showForm && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Nova recorrência</h2>
          <div className="flex flex-col gap-3">
            <Input label="Descrição" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Salário" />
            <Select
              label="Tipo"
              options={[
                { value: 'income', label: 'Entrada' },
                { value: 'expense', label: 'Saída' },
              ]}
              value={type}
              onChange={(e) => {
                setType(e.target.value as TransactionType)
                setCategoryId('')
              }}
            />
            <Input label="Valor (R$)" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Select
              label="Categoria"
              options={[
                { value: '', label: 'Selecione...' },
                ...filteredCategories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            />
            <Select
              label="Conta"
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />
            <Select
              label="Frequência"
              options={[
                { value: 'monthly', label: 'Mensal' },
                { value: 'weekly', label: 'Semanal' },
                { value: 'yearly', label: 'Anual' },
              ]}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
            />
            {frequency === 'weekly' ? (
              <Select
                label="Dia da semana"
                options={weekDayLabels.map((label, i) => ({ value: String(i), label }))}
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
              />
            ) : (
              <Input
                label="Dia do mês"
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
              />
            )}
            <Select
              label="Status ao gerar"
              options={[
                { value: 'paid', label: 'Efetivada' },
                { value: 'pending', label: 'Prevista' },
              ]}
              value={status}
              onChange={(e) => setStatus(e.target.value as 'paid' | 'pending')}
            />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button fullWidth onClick={handleCreate} disabled={loading || !name.trim() || !categoryId}>
                {loading ? 'Salvando...' : 'Criar recorrência'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {recurrences.length === 0 && !showForm && (
          <Card>
            <p className="text-center text-gray-400 py-8">Nenhuma recorrência cadastrada</p>
          </Card>
        )}
        {recurrences.map((rec) => {
          const cat = categories.find((c) => c.id === rec.template.categoryId)
          return (
            <Card key={rec.id} padding="sm">
              <div className="flex items-start gap-3">
                <div
                  className={[
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    rec.template.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500',
                  ].join(' ')}
                >
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">{rec.template.description}</p>
                    <button
                      type="button"
                      onClick={() => household && deleteRecurrence(household.id, rec.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      aria-label="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    {cat?.name} · {scheduleLabel(rec)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Próximo: {formatDate(rec.nextRunDate)}
                    {!rec.active && ' · Pausada'}
                  </p>
                  <p className={`font-semibold mt-1 ${rec.template.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {rec.template.type === 'income' ? '+' : '-'}{formatCurrency(rec.template.amount)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() => toggleActive(rec.id, rec.active)}
              >
                {rec.active ? 'Pausar' : 'Reativar'}
              </Button>
            </Card>
          )
        })}
      </div>

      <Link to="/ajustes" className="text-sm text-primary text-center">
        ← Voltar aos ajustes
      </Link>
    </div>
  )
}
