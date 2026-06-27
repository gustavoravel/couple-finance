import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Paperclip, Trash2 } from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { deleteTransaction } from '@/services/transactionService'
import { deleteTransfer } from '@/services/transferService'
import { FilterBar } from '@/components/filters/FilterBar'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/format'
import { defaultFilters, mergeAndSort } from '@/lib/transactionFilters'
import type { Transaction, Transfer } from '@/types'

export function TransactionsPage() {
  const { household, accounts, categories, cards, transactions, transfers, members } = useHousehold()
  const [filters, setFilters] = useState(defaultFilters)

  const items = useMemo(
    () => mergeAndSort(transactions, transfers, filters),
    [transactions, transfers, filters],
  )

  const handleDeleteTx = async (tx: Transaction) => {
    if (!household || !confirm('Excluir este lançamento?')) return
    await deleteTransaction(household.id, tx)
  }

  const handleDeleteTransfer = async (tr: Transfer) => {
    if (!household || !confirm('Excluir esta transferência?')) return
    await deleteTransfer(household.id, tr)
  }

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? 'Sem categoria'

  const getAccountName = (accountId: string) =>
    accounts.find((a) => a.id === accountId)?.name ?? 'Conta'

  const getMemberName = (uid: string) =>
    members.find((m) => m.uid === uid)?.name ?? ''

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Lançamentos</h1>
        <p className="text-sm text-gray-500">{items.length} registros</p>
      </header>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        categories={categories}
        accounts={accounts}
        cards={cards}
        members={members}
      />

      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <Card>
            <p className="text-center text-gray-400 py-8">Nenhum registro no período</p>
          </Card>
        )}
        {items.map((item) =>
          item.kind === 'transfer' ? (
            <Card key={`tr-${item.data.id}`} padding="sm" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary-50 text-primary">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {item.data.description || 'Transferência'}
                </p>
                <p className="text-xs text-gray-400">
                  {getAccountName(item.data.fromAccountId)} → {getAccountName(item.data.toAccountId)}
                  {' · '}{formatDate(item.data.date)}
                  {getMemberName(item.data.createdBy) && ` · ${getMemberName(item.data.createdBy)}`}
                </p>
              </div>
              <p className="font-semibold shrink-0 text-primary">
                {formatCurrency(item.data.amount)}
              </p>
              <button
                onClick={() => handleDeleteTransfer(item.data)}
                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                aria-label="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ) : (
            <Card key={`tx-${item.data.id}`} padding="sm" className="flex items-center gap-3">
              <div
                className={[
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  item.data.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500',
                ].join(' ')}
              >
                {item.data.type === 'income' ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {item.data.description || getCategoryName(item.data.categoryId)}
                </p>
                <p className="text-xs text-gray-400">
                  {getCategoryName(item.data.categoryId)}
                  {item.data.paymentMethod === 'card' && item.data.cardId && (
                    <> · {cards.find((c) => c.id === item.data.cardId)?.name ?? 'Cartão'}</>
                  )}
                  {' · '}{formatDate(item.data.date)}
                  {item.data.status === 'pending' && ' · Previsto'}
                  {item.data.installment && ` · ${item.data.installment.current}/${item.data.installment.total}x`}
                  {getMemberName(item.data.createdBy) && ` · ${getMemberName(item.data.createdBy)}`}
                </p>
              </div>
              <p
                className={[
                  'font-semibold shrink-0',
                  item.data.type === 'income' ? 'text-green-600' : 'text-red-500',
                ].join(' ')}
              >
                {item.data.type === 'income' ? '+' : '-'}{formatCurrency(item.data.amount)}
              </p>
              {item.data.attachmentUrl && (
                <a
                  href={item.data.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-primary transition-colors"
                  aria-label="Ver comprovante"
                >
                  <Paperclip className="w-4 h-4" />
                </a>
              )}
              <button
                onClick={() => handleDeleteTx(item.data)}
                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                aria-label="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ),
        )}
      </div>
    </div>
  )
}
