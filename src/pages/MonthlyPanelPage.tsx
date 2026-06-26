import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/format'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function MonthlyPanelPage() {
  const { transactions } = useHousehold()
  const [year, setYear] = useState(new Date().getFullYear())

  const monthlyData = useMemo(() => {
    return MONTHS.map((label, index) => {
      const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`
      const monthTx = transactions.filter(
        (t) => t.date.startsWith(monthKey) && t.status === 'paid',
      )
      const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const surplus = income - expense
      return { label, monthKey, income, expense, surplus }
    })
  }, [transactions, year])

  const yearTotals = useMemo(() => {
    const income = monthlyData.reduce((s, m) => s + m.income, 0)
    const expense = monthlyData.reduce((s, m) => s + m.expense, 0)
    return { income, expense, surplus: income - expense }
  }, [monthlyData])

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Painel mensal</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Ano anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-semibold text-gray-900 min-w-[48px] text-center">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Próximo ano"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Card padding="sm" className="text-center">
          <p className="text-xs text-gray-400">Entradas</p>
          <p className="text-sm font-bold text-green-600">{formatCurrency(yearTotals.income)}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xs text-gray-400">Saídas</p>
          <p className="text-sm font-bold text-red-500">{formatCurrency(yearTotals.expense)}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xs text-gray-400">Sobra</p>
          <p className={`text-sm font-bold ${yearTotals.surplus >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(yearTotals.surplus)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Quanto sobra por mês</h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="surplus" radius={[4, 4, 0, 0]}>
                {monthlyData.map((entry) => (
                  <Cell key={entry.monthKey} fill={entry.surplus >= 0 ? '#22C55E' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-gray-900 mb-3">Detalhamento</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">Mês</th>
                <th className="pb-2 font-medium text-right">Entradas</th>
                <th className="pb-2 font-medium text-right">Saídas</th>
                <th className="pb-2 font-medium text-right">Sobra</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m) => (
                <tr key={m.monthKey} className="border-b border-gray-50">
                  <td className="py-2.5 font-medium text-gray-700">{m.label}</td>
                  <td className="py-2.5 text-right text-green-600">{formatCurrency(m.income)}</td>
                  <td className="py-2.5 text-right text-red-500">{formatCurrency(m.expense)}</td>
                  <td className={`py-2.5 text-right font-semibold ${m.surplus >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {formatCurrency(m.surplus)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
