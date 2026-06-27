import { useMemo, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Legend,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, CreditCard, ChevronRight, Shield, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useHousehold } from '@/contexts/HouseholdContext'
import { FilterBar } from '@/components/filters/FilterBar'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate, getMonthKey } from '@/lib/format'
import { formatCompetencia } from '@/lib/invoiceUtils'
import {
  averageMonthlyExpense,
  budgetStatuses,
  emergencyCoverageMonths,
  goalCurrentAmount,
  goalProgress,
} from '@/lib/planningUtils'
import {
  defaultFilters,
  filterTransactions,
  monthlySeries,
  sumExpense,
  sumIncome,
} from '@/lib/transactionFilters'

export function DashboardPage() {
  const { household, accounts, categories, cards, invoices, goals, budgets, transactions, members } = useHousehold()
  const [filters, setFilters] = useState(defaultFilters)
  const monthKey = getMonthKey(new Date())

  const chartYear = filters.periodMode === 'year' ? filters.year : Number(filters.month.slice(0, 4))

  const openInvoices = useMemo(
    () =>
      invoices
        .filter((inv) => inv.status !== 'paid' && inv.total > 0)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [invoices],
  )

  const emergencyAccount = accounts.find((a) => a.type === 'emergency_reserve' && !a.archived)
  const avgExpense = useMemo(() => averageMonthlyExpense(transactions), [transactions])
  const reserveCoverage = emergencyAccount
    ? emergencyCoverageMonths(emergencyAccount.currentBalance, avgExpense)
    : 0

  const activeGoals = useMemo(
    () =>
      goals
        .map((g) => ({
          goal: g,
          current: goalCurrentAmount(g, accounts),
          progress: goalProgress(goalCurrentAmount(g, accounts), g.targetAmount),
        }))
        .filter((g) => g.progress < 100)
        .slice(0, 3),
    [goals, accounts],
  )

  const overBudgetItems = useMemo(
    () => budgetStatuses(budgets, transactions, monthKey).filter((b) => b.overBudget),
    [budgets, transactions, monthKey],
  )

  const analytics = useMemo(() => {
    const filtered = filterTransactions(transactions, { ...filters, type: 'all' })
    const income = sumIncome(transactions, { ...filters, type: 'all' })
    const expense = sumExpense(transactions, { ...filters, type: 'all' })
    const balance = income - expense

    const byCategory = new Map<string, number>()
    filtered
      .filter((t) => t.type === 'expense' && t.status === 'paid')
      .forEach((t) => {
        const cat = categories.find((c) => c.id === t.categoryId)
        const name = cat?.name ?? 'Outros'
        byCategory.set(name, (byCategory.get(name) ?? 0) + t.amount)
      })

    const pieData = Array.from(byCategory.entries())
      .map(([name, value]) => {
        const cat = categories.find((c) => c.name === name)
        return { name, value, color: cat?.color ?? '#94A3B8' }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    const monthly = monthlySeries(transactions, chartYear)
    let cumulative = 0
    const evolution = monthly.map((m) => {
      cumulative += m.surplus
      return { label: m.label, surplus: m.surplus, cumulative }
    })

    return { income, expense, balance, pieData, monthly, evolution }
  }, [transactions, categories, filters, chartYear])

  const totalBalance = accounts
    .filter((a) => a.includeInTotal && !a.archived)
    .reduce((s, a) => s + a.currentBalance, 0)

  const periodLabel =
    filters.periodMode === 'month'
      ? new Date(filters.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : filters.periodMode === 'year'
        ? String(filters.year)
        : 'Período selecionado'

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-gray-500">Olá! 👋</p>
        <h1 className="text-xl font-bold text-gray-900">{household?.name ?? 'Finanças do Casal'}</h1>
      </header>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        categories={categories}
        accounts={accounts}
        cards={cards}
        members={members}
        showTypeFilter={false}
      />

      <Card className="bg-gradient-to-br from-primary to-primary-dark text-white border-0">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 opacity-80" />
          <span className="text-sm opacity-80">Saldo total</span>
        </div>
        <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
        <p className="text-sm opacity-70 mt-2 capitalize">{periodLabel}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Entradas</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(analytics.income)}</p>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">Saídas</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(analytics.expense)}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Quanto sobra</h2>
          <span className={`text-lg font-bold ${analytics.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(analytics.balance)}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${analytics.balance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{
              width: `${Math.min(100, analytics.income > 0 ? (analytics.expense / analytics.income) * 100 : 0)}%`,
            }}
          />
        </div>
      </Card>

      {emergencyAccount && (
        <Link to="/metas">
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 opacity-90" />
                <div>
                  <p className="text-sm opacity-80">Reserva de emergência</p>
                  <p className="text-xl font-bold">{formatCurrency(emergencyAccount.currentBalance)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{reserveCoverage.toFixed(1)}</p>
                <p className="text-xs opacity-80">meses de cobertura</p>
              </div>
            </div>
          </Card>
        </Link>
      )}

      {activeGoals.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Metas em andamento</h2>
            <Link to="/metas" className="text-xs text-primary font-medium">Ver todas</Link>
          </div>
          <div className="flex flex-col gap-3">
            {activeGoals.map(({ goal, current, progress }) => (
              <div key={goal.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">{goal.name}</span>
                  <span className="text-gray-500">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: goal.color }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatCurrency(current)} de {formatCurrency(goal.targetAmount)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {overBudgetItems.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Orçamento estourado
            </h2>
            <Link to="/metas" className="text-xs text-primary font-medium">Ver orçamentos</Link>
          </div>
          <div className="flex flex-col gap-2">
            {overBudgetItems.slice(0, 4).map((b) => {
              const cat = categories.find((c) => c.id === b.categoryId)
              return (
                <div key={b.categoryId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{cat?.name ?? 'Categoria'}</span>
                  <span className="font-medium text-red-500">
                    {formatCurrency(b.spent)} / {formatCurrency(b.planned)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {openInvoices.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Faturas em aberto</h2>
            <Link to="/cartoes" className="text-xs text-primary font-medium">Ver cartões</Link>
          </div>
          <div className="flex flex-col gap-2">
            {openInvoices.slice(0, 4).map((inv) => {
              const card = cards.find((c) => c.id === inv.cardId)
              return (
                <Link
                  key={inv.id}
                  to={`/cartoes/${inv.cardId}`}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {card?.name ?? 'Cartão'}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {formatCompetencia(inv.competencia)} · vence {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 shrink-0">{formatCurrency(inv.total)}</p>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </Link>
              )
            })}
          </div>
        </Card>
      )}

      {analytics.pieData.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Gastos por categoria</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {analytics.pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {analytics.pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600 truncate max-w-[140px]">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Entradas × saídas — {chartYear}</h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="income" name="Entradas" fill="#22C55E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Evolução do saldo acumulado — {chartYear}</h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.evolution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="surplus"
                name="Sobra mensal"
                stroke="#7F3DFF"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Acumulado"
                stroke="#22C55E"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
