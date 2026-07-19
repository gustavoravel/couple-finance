import { useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, CreditCard, Paperclip, Trash2 } from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { deleteTransaction } from '@/services/transactionService'
import { deleteTransfer } from '@/services/transferService'
import { FilterBar } from '@/components/filters/FilterBar'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { formatCurrency, formatDayHeader } from '@/lib/format'
import { defaultFilters, mergeAndSort, type ListItem } from '@/lib/transactionFilters'
import type { Transaction, Transfer } from '@/types'

function groupByDate(items: ListItem[]): Array<{ date: string; items: ListItem[] }> {
  const groups: Array<{ date: string; items: ListItem[] }> = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && last.date === item.date) {
      last.items.push(item)
    } else {
      groups.push({ date: item.date, items: [item] })
    }
  }
  return groups
}

export function TransactionsPage() {
  const navigate = useNavigate()
  const { household, accounts, categories, cards, transactions, transfers, members } = useHousehold()
  const [filters, setFilters] = useState(defaultFilters)

  const items = useMemo(
    () => mergeAndSort(transactions, transfers, filters),
    [transactions, transfers, filters],
  )

  const groups = useMemo(() => groupByDate(items), [items])

  const handleDeleteTx = async (tx: Transaction, e: MouseEvent) => {
    e.stopPropagation()
    if (!household || !confirm('Excluir este lançamento?')) return
    await deleteTransaction(household.id, tx)
  }

  const handleDeleteTransfer = async (tr: Transfer, e: MouseEvent) => {
    e.stopPropagation()
    if (!household || !confirm('Excluir esta transferência?')) return
    await deleteTransfer(household.id, tr)
  }

  const getCategory = (categoryId: string) => categories.find((c) => c.id === categoryId)

  const getCategoryName = (categoryId: string) =>
    getCategory(categoryId)?.name ?? 'Sem categoria'

  const getAccountName = (accountId: string) =>
    accounts.find((a) => a.id === accountId)?.name ?? 'Conta'

  const getMemberName = (uid: string) =>
    members.find((m) => m.uid === uid)?.name ?? ''

  const getCardName = (cardId?: string) =>
    cards.find((c) => c.id === cardId)?.name ?? 'Cartão'

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

      <div className="flex flex-col gap-5">
        {items.length === 0 && (
          <Card>
            <p className="text-center text-gray-400 py-8">Nenhum registro no período</p>
          </Card>
        )}
        {groups.map((group) => (
          <section key={group.date} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-gray-700 px-1 pt-1">
              {formatDayHeader(group.date)}
            </h2>
            {group.items.map((item) =>
              item.kind === 'transfer' ? (
                <Card key={`tr-${item.data.id}`} padding="sm" className="flex items-center gap-3">
                  <div
                    className={[
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      item.data.kind === 'invoice_payment'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-primary-50 text-primary',
                    ].join(' ')}
                  >
                    {item.data.kind === 'invoice_payment' ? (
                      <CreditCard className="w-5 h-5" />
                    ) : (
                      <ArrowLeftRight className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.data.description ||
                        (item.data.kind === 'invoice_payment' ? 'Pagamento de fatura' : 'Transferência')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.data.kind === 'invoice_payment' ? (
                        <>
                          {getAccountName(item.data.fromAccountId)}
                          {' → '}
                          {getCardName(item.data.cardId)}
                          {' · Fatura'}
                        </>
                      ) : (
                        <>
                          {getAccountName(item.data.fromAccountId)}
                          {item.data.toAccountId ? ` → ${getAccountName(item.data.toAccountId)}` : ''}
                        </>
                      )}
                      {getMemberName(item.data.createdBy) && ` · ${getMemberName(item.data.createdBy)}`}
                    </p>
                  </div>
                  <p
                    className={[
                      'font-semibold shrink-0',
                      item.data.kind === 'invoice_payment' ? 'text-red-500' : 'text-primary',
                    ].join(' ')}
                  >
                    {item.data.kind === 'invoice_payment' ? '-' : ''}
                    {formatCurrency(item.data.amount)}
                  </p>
                  <button
                    onClick={(e) => handleDeleteTransfer(item.data, e)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    aria-label="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ) : (
                <Card
                  key={`tx-${item.data.id}`}
                  padding="sm"
                  className="flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/lancamentos/${item.data.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/lancamentos/${item.data.id}`)
                    }
                  }}
                >
                  {(() => {
                    const cat = getCategory(item.data.categoryId)
                    const color = cat?.color ?? (item.data.type === 'income' ? '#22C55E' : '#EF4444')
                    return (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${color}22`, color }}
                      >
                        <Icon name={cat?.icon ?? (item.data.type === 'income' ? 'wallet' : 'tag')} size={20} />
                      </div>
                    )
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.data.description || getCategoryName(item.data.categoryId)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {getCategoryName(item.data.categoryId)}
                      {item.data.paymentMethod === 'card' && item.data.cardId && (
                        <> · {cards.find((c) => c.id === item.data.cardId)?.name ?? 'Cartão'}</>
                      )}
                      {item.data.paymentMethod === 'account' && item.data.accountId && (
                        <> · {getAccountName(item.data.accountId)}</>
                      )}
                      {item.data.status === 'pending' && ' · Previsto'}
                      {item.data.installment && ` · ${item.data.installment.current}/${item.data.installment.total}x`}
                      {item.data.recurrenceId && ' · Recorrente'}
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
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-gray-400 hover:text-primary transition-colors"
                      aria-label="Ver comprovante"
                    >
                      <Paperclip className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={(e) => handleDeleteTx(item.data, e)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    aria-label="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ),
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
