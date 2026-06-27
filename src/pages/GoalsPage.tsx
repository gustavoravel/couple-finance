import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Shield, Target, Trash2, AlertTriangle } from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { createGoal, deleteGoal } from '@/services/goalService'
import { createBudget, deleteBudget } from '@/services/budgetService'
import { updateAccount } from '@/services/accountService'
import {
  averageMonthlyExpense,
  budgetStatuses,
  emergencyCoverageMonths,
  emergencyTargetAmount,
  goalCurrentAmount,
  goalProgress,
  suggestedMonthlyContribution,
} from '@/lib/planningUtils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate, getMonthKey, toISODate } from '@/lib/format'

const goalColors = ['#7F3DFF', '#3B82F6', '#22C55E', '#F59E0B', '#EC4899']

export function GoalsPage() {
  const { household, accounts, categories, goals, budgets, transactions } = useHousehold()
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDate, setGoalDate] = useState('')
  const [goalAccountId, setGoalAccountId] = useState('')

  const [budgetCategoryId, setBudgetCategoryId] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetRecurring, setBudgetRecurring] = useState(true)

  const monthKey = getMonthKey(new Date())
  const avgExpense = useMemo(() => averageMonthlyExpense(transactions), [transactions])

  const emergencyAccount = accounts.find((a) => a.type === 'emergency_reserve' && !a.archived)
  const reserveCoverage = emergencyAccount
    ? emergencyCoverageMonths(emergencyAccount.currentBalance, avgExpense)
    : 0
  const reserveTargetMonths = emergencyAccount?.emergencyTargetMonths ?? 6
  const reserveTargetAmount = emergencyTargetAmount(reserveTargetMonths, avgExpense)
  const reserveProgress = goalProgress(emergencyAccount?.currentBalance ?? 0, reserveTargetAmount)

  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const savingsAccounts = accounts.filter((a) => !a.archived)
  const budgetList = useMemo(
    () => budgetStatuses(budgets, transactions, monthKey),
    [budgets, transactions, monthKey],
  )

  const handleUpdateReserveTarget = async (months: number) => {
    if (!household || !emergencyAccount) return
    await updateAccount(household.id, emergencyAccount.id, { emergencyTargetMonths: months })
  }

  const handleCreateGoal = async () => {
    if (!household || !goalName.trim() || !goalTarget || !goalDate) return
    setLoading(true)
    const targetAmount = parseFloat(goalTarget)
    await createGoal(household.id, {
      name: goalName.trim(),
      targetAmount,
      currentAmount: 0,
      targetDate: goalDate,
      monthlyContribution: suggestedMonthlyContribution(0, targetAmount, goalDate),
      linkedAccountId: goalAccountId || null,
      icon: 'target',
      color: goalColors[goals.length % goalColors.length],
    })
    setGoalName('')
    setGoalTarget('')
    setGoalDate('')
    setGoalAccountId('')
    setShowGoalForm(false)
    setLoading(false)
  }

  const handleCreateBudget = async () => {
    if (!household || !budgetCategoryId || !budgetAmount) return
    setLoading(true)
    await createBudget(household.id, {
      categoryId: budgetCategoryId,
      competencia: budgetRecurring ? '' : monthKey,
      recurring: budgetRecurring,
      plannedAmount: parseFloat(budgetAmount),
    })
    setBudgetCategoryId('')
    setBudgetAmount('')
    setShowBudgetForm(false)
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Metas & Reserva</h1>
        <p className="text-sm text-gray-500">Planejamento financeiro do casal</p>
      </header>

      <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 opacity-90" />
          <h2 className="font-semibold">Reserva de emergência</h2>
        </div>

        {emergencyAccount ? (
          <>
            <p className="text-2xl font-bold">{formatCurrency(emergencyAccount.currentBalance)}</p>
            <p className="text-sm opacity-90 mt-1">
              Cobre <strong>{reserveCoverage.toFixed(1)} meses</strong> de despesas
              {avgExpense > 0 && <> (média {formatCurrency(avgExpense)}/mês)</>}
            </p>

            <div className="mt-3">
              <div className="flex justify-between text-xs opacity-80 mb-1">
                <span>Meta: {reserveTargetMonths} meses</span>
                <span>{formatCurrency(reserveTargetAmount)}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${reserveProgress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs opacity-80">Meta em meses:</span>
              {[3, 6, 9, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleUpdateReserveTarget(m)}
                  className={[
                    'px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                    reserveTargetMonths === m ? 'bg-white text-orange-600' : 'bg-white/20 hover:bg-white/30',
                  ].join(' ')}
                >
                  {m}m
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm opacity-90 mb-3">
              Crie uma conta do tipo &quot;Reserva de emergência&quot; para acompanhar sua cobertura.
            </p>
            <Link
              to="/contas"
              className="inline-block text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors"
            >
              Cadastrar conta →
            </Link>
          </div>
        )}
      </Card>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Metas</h2>
          <Button size="sm" onClick={() => setShowGoalForm(!showGoalForm)}>
            <Plus className="w-4 h-4" />
            Nova
          </Button>
        </div>

        {showGoalForm && (
          <Card className="mb-3">
            <div className="flex flex-col gap-3">
              <Input label="Nome" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Ex.: Viagem de férias" />
              <Input label="Valor-alvo (R$)" type="number" step="0.01" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} />
              <Input label="Data-alvo" type="date" value={goalDate} min={toISODate(new Date())} onChange={(e) => setGoalDate(e.target.value)} />
              <Select
                label="Conta vinculada (opcional)"
                options={[
                  { value: '', label: 'Nenhuma' },
                  ...savingsAccounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
                value={goalAccountId}
                onChange={(e) => setGoalAccountId(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowGoalForm(false)}>Cancelar</Button>
                <Button fullWidth onClick={handleCreateGoal} disabled={loading || !goalName.trim()}>
                  {loading ? 'Salvando...' : 'Criar meta'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          {goals.length === 0 && !showGoalForm && (
            <Card>
              <p className="text-center text-gray-400 py-6">Nenhuma meta cadastrada</p>
            </Card>
          )}
          {goals.map((goal) => {
            const current = goalCurrentAmount(goal, accounts)
            const progress = goalProgress(current, goal.targetAmount)
            const suggested = suggestedMonthlyContribution(current, goal.targetAmount, goal.targetDate)

            return (
              <Card key={goal.id} padding="sm">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                  >
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900">{goal.name}</p>
                      <button
                        type="button"
                        onClick={() => household && deleteGoal(household.id, goal.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        aria-label="Excluir meta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">
                      Até {formatDate(goal.targetDate)}
                      {goal.linkedAccountId && ` · ${accounts.find((a) => a.id === goal.linkedAccountId)?.name}`}
                    </p>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600">{formatCurrency(current)}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress}%`, backgroundColor: goal.color }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {progress.toFixed(0)}% · Aporte sugerido: {formatCurrency(suggested)}/mês
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Orçamento do mês</h2>
          <Button size="sm" onClick={() => setShowBudgetForm(!showBudgetForm)}>
            <Plus className="w-4 h-4" />
            Novo
          </Button>
        </div>

        {showBudgetForm && (
          <Card className="mb-3">
            <div className="flex flex-col gap-3">
              <Select
                label="Categoria"
                options={[
                  { value: '', label: 'Selecione...' },
                  ...expenseCategories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={budgetCategoryId}
                onChange={(e) => setBudgetCategoryId(e.target.value)}
              />
              <Input
                label="Valor planejado (R$)"
                type="number"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
              <Select
                label="Recorrência"
                options={[
                  { value: 'true', label: 'Todo mês (recorrente)' },
                  { value: 'false', label: 'Somente este mês' },
                ]}
                value={String(budgetRecurring)}
                onChange={(e) => setBudgetRecurring(e.target.value === 'true')}
              />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowBudgetForm(false)}>Cancelar</Button>
                <Button fullWidth onClick={handleCreateBudget} disabled={loading || !budgetCategoryId}>
                  {loading ? 'Salvando...' : 'Criar orçamento'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          {budgetList.length === 0 && !showBudgetForm && (
            <Card>
              <p className="text-center text-gray-400 py-6">Nenhum orçamento definido</p>
            </Card>
          )}
          {budgetList.map((b) => {
            const cat = categories.find((c) => c.id === b.categoryId)
            const budgetDoc = budgets.find(
              (bd) =>
                bd.categoryId === b.categoryId &&
                (bd.recurring || bd.competencia === monthKey),
            )

            return (
              <Card key={b.categoryId} padding="sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {b.overBudget && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    <p className="font-medium text-gray-900">{cat?.name ?? 'Categoria'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${b.overBudget ? 'text-red-500' : 'text-gray-900'}`}>
                      {formatCurrency(b.spent)} / {formatCurrency(b.planned)}
                    </span>
                    {budgetDoc && household && (
                      <button
                        type="button"
                        onClick={() => deleteBudget(household.id, budgetDoc.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        aria-label="Excluir orçamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${b.overBudget ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, b.pct)}%` }}
                  />
                </div>
                {b.overBudget && (
                  <p className="text-xs text-red-500 mt-1">
                    Estourou em {formatCurrency(b.spent - b.planned)}
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
