import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { Card } from '@/components/ui/Card'
import { formatCurrency, getMonthKey } from '@/lib/format'

export function DashboardPage() {
  const { household, accounts, categories, transactions } = useHousehold()

  const monthKey = getMonthKey(new Date())

  const monthData = useMemo(() => {
    const monthTx = transactions.filter((t) => t.date.startsWith(monthKey) && t.status === 'paid')
    const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const balance = income - expense

    const byCategory = new Map<string, number>()
    monthTx
      .filter((t) => t.type === 'expense')
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
      .slice(0, 6)

    return { income, expense, balance, pieData }
  }, [transactions, categories, monthKey])

  const totalBalance = accounts
    .filter((a) => a.includeInTotal && !a.archived)
    .reduce((s, a) => s + a.currentBalance, 0)

  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-gray-500">Olá! 👋</p>
        <h1 className="text-xl font-bold text-gray-900">{household?.name ?? 'Finanças do Casal'}</h1>
      </header>

      <Card className="bg-gradient-to-br from-primary to-primary-dark text-white border-0">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 opacity-80" />
          <span className="text-sm opacity-80">Saldo total</span>
        </div>
        <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
        <p className="text-sm opacity-70 mt-2 capitalize">{monthLabel}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Entradas</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(monthData.income)}</p>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">Saídas</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(monthData.expense)}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Quanto sobra</h2>
          <span className={`text-lg font-bold ${monthData.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(monthData.balance)}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${monthData.balance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{
              width: `${Math.min(100, monthData.income > 0 ? (monthData.expense / monthData.income) * 100 : 0)}%`,
            }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {monthData.income > 0
            ? `${((monthData.expense / monthData.income) * 100).toFixed(0)}% das entradas utilizadas`
            : 'Sem entradas neste mês'}
        </p>
      </Card>

      {monthData.pieData.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Gastos por categoria</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={monthData.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {monthData.pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {monthData.pieData.map((item) => (
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
    </div>
  )
}
