import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { deleteTransaction } from '@/services/transactionService'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Transaction } from '@/types'

export function TransactionsPage() {
  const { household, categories, transactions } = useHousehold()
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions
    return transactions.filter((t) => t.type === filter)
  }, [transactions, filter])

  const handleDelete = async (tx: Transaction) => {
    if (!household || !confirm('Excluir este lançamento?')) return
    await deleteTransaction(household.id, tx)
  }

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? 'Sem categoria'

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Lançamentos</h1>
        <p className="text-sm text-gray-500">{filtered.length} registros</p>
      </header>

      <div className="flex gap-2">
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              filter === f ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200',
            ].join(' ')}
          >
            {f === 'all' ? 'Todos' : f === 'income' ? 'Entradas' : 'Saídas'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <Card>
            <p className="text-center text-gray-400 py-8">Nenhum lançamento ainda</p>
          </Card>
        )}
        {filtered.map((tx) => (
          <Card key={tx.id} padding="sm" className="flex items-center gap-3">
            <div
              className={[
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                tx.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500',
              ].join(' ')}
            >
              {tx.type === 'income' ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {tx.description || getCategoryName(tx.categoryId)}
              </p>
              <p className="text-xs text-gray-400">
                {getCategoryName(tx.categoryId)} · {formatDate(tx.date)}
                {tx.status === 'pending' && ' · Previsto'}
              </p>
            </div>
            <p
              className={[
                'font-semibold shrink-0',
                tx.type === 'income' ? 'text-green-600' : 'text-red-500',
              ].join(' ')}
            >
              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
            </p>
            <button
              onClick={() => handleDelete(tx)}
              className="p-2 text-gray-300 hover:text-red-500 transition-colors"
              aria-label="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}
