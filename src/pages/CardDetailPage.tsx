import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, CreditCard, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { payInvoice } from '@/services/invoiceService'
import { deleteTransaction } from '@/services/transactionService'
import { getCardUsedLimit, formatCompetencia, getInvoiceRemaining } from '@/lib/invoiceUtils'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'
import { formatCurrency, formatDate, formatDayHeader, toISODate } from '@/lib/format'
import type { Invoice, Transaction } from '@/types'

const statusLabels: Record<Invoice['status'], string> = {
  open: 'Aberta',
  closed: 'Fechada',
  paid: 'Paga',
}

const statusColors: Record<Invoice['status'], string> = {
  open: 'bg-blue-50 text-blue-600',
  closed: 'bg-amber-50 text-amber-600',
  paid: 'bg-green-50 text-green-600',
}

function groupByDate(txs: Transaction[]): Array<{ date: string; items: Transaction[] }> {
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date))
  const groups: Array<{ date: string; items: Transaction[] }> = []
  for (const tx of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.date === tx.date) last.items.push(tx)
    else groups.push({ date: tx.date, items: [tx] })
  }
  return groups
}

export function CardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { household, accounts, cards, invoices, transactions, categories } = useHousehold()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')

  const card = cards.find((c) => c.id === cardId)
  const cardInvoices = useMemo(
    () => invoices.filter((inv) => inv.cardId === cardId).sort((a, b) => a.competencia.localeCompare(b.competencia)),
    [invoices, cardId],
  )

  const activeInvoice = selectedInvoiceId
    ? cardInvoices.find((inv) => inv.id === selectedInvoiceId)
    : cardInvoices.find((inv) => inv.status !== 'paid') ?? cardInvoices[cardInvoices.length - 1]

  const remaining = activeInvoice ? getInvoiceRemaining(activeInvoice) : 0
  const paidSoFar = activeInvoice?.paidAmount ?? 0

  useEffect(() => {
    if (!activeInvoice || activeInvoice.status === 'paid') {
      setPaymentAmount('')
      return
    }
    setPaymentAmount(String(getInvoiceRemaining(activeInvoice)))
    setError('')
  }, [activeInvoice?.id, activeInvoice?.total, activeInvoice?.paidAmount, activeInvoice?.status])

  const invoiceTransactions = useMemo(
    () =>
      activeInvoice
        ? transactions.filter((t) => t.invoiceId === activeInvoice.id)
        : [],
    [transactions, activeInvoice],
  )

  const invoiceGroups = useMemo(() => groupByDate(invoiceTransactions), [invoiceTransactions])

  const used = card ? getCardUsedLimit(invoices, card.id) : 0
  const paymentAccount = accounts.find((a) => a.id === card?.paymentAccountId)

  const getCategory = (categoryId: string) => categories.find((c) => c.id === categoryId)

  const getCategoryName = (categoryId: string) =>
    getCategory(categoryId)?.name ?? 'Sem categoria'

  const handleDeleteTx = async (tx: Transaction, e: MouseEvent) => {
    e.stopPropagation()
    if (!household || !confirm('Excluir este lançamento do cartão?')) return
    await deleteTransaction(household.id, tx)
  }

  const handlePay = async () => {
    if (!household || !user || !card || !activeInvoice) return

    const amount = parseFloat(paymentAmount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Informe um valor válido')
      return
    }
    if (amount > remaining) {
      setError(`Valor maior que o saldo (${formatCurrency(remaining)})`)
      return
    }

    const isFull = amount >= remaining
    const label = isFull
      ? `Pagar fatura integral de ${formatCurrency(amount)}?`
      : `Adiantar ${formatCurrency(amount)}? O saldo da fatura cairá para ${formatCurrency(remaining - amount)} e o limite será liberado.`

    if (!confirm(label)) return

    setError('')
    setPaying(true)
    try {
      await payInvoice(household.id, activeInvoice, card, user.uid, toISODate(new Date()), amount)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao pagar fatura')
    } finally {
      setPaying(false)
    }
  }

  if (!card) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/cartoes" className="flex items-center gap-2 text-sm text-gray-500">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <Card>
          <p className="text-center text-gray-400 py-8">Cartão não encontrado</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link to="/cartoes" className="flex items-center gap-2 text-sm text-gray-500">
          <ArrowLeft className="w-4 h-4" />
          Cartões
        </Link>
        <Button size="sm" onClick={() => navigate('/novo')}>
          Novo gasto
        </Button>
      </div>

      <Card className="text-white border-0" style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}cc)` }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm opacity-80">{card.brand}</p>
            <h1 className="text-xl font-bold">{card.name}</h1>
          </div>
          <CreditCard className="w-8 h-8 opacity-60" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs opacity-70">Limite usado</p>
            <p className="text-lg font-bold">{formatCurrency(used)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">Disponível</p>
            <p className="text-lg font-bold">{formatCurrency(Math.max(0, card.limit - used))}</p>
          </div>
        </div>
        <p className="text-xs opacity-60 mt-3">
          Fecha dia {card.closingDay} · Vence dia {card.dueDay}
          {paymentAccount && ` · Pago via ${paymentAccount.name}`}
        </p>
      </Card>

      <div>
        <h2 className="font-semibold text-gray-900 mb-2">Faturas</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cardInvoices.length === 0 && (
            <p className="text-sm text-gray-400">Nenhuma fatura ainda</p>
          )}
          {cardInvoices.map((inv) => (
            <button
              key={inv.id}
              type="button"
              onClick={() => setSelectedInvoiceId(inv.id)}
              className={[
                'shrink-0 px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
                activeInvoice?.id === inv.id
                  ? 'bg-primary-50 border-primary text-primary'
                  : 'bg-white border-gray-200 text-gray-600',
              ].join(' ')}
            >
              {formatCompetencia(inv.competencia)}
            </button>
          ))}
        </div>
      </div>

      {activeInvoice && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 capitalize">
                {formatCompetencia(activeInvoice.competencia)}
              </h3>
              <p className="text-xs text-gray-400">
                Vencimento: {formatDate(activeInvoice.dueDate)}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-lg ${statusColors[activeInvoice.status]}`}>
              {statusLabels[activeInvoice.status]}
            </span>
          </div>

          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(remaining)}
          </p>
          {paidSoFar > 0 && activeInvoice.status !== 'paid' && (
            <p className="text-xs text-gray-400 mb-4">
              Total {formatCurrency(activeInvoice.total)} · já pago {formatCurrency(paidSoFar)}
            </p>
          )}
          {paidSoFar === 0 && <div className="mb-4" />}

          {activeInvoice.status !== 'paid' && remaining > 0 && (
            <div className="flex flex-col gap-3">
              <Input
                label="Valor a pagar / adiantar (R$)"
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(String(remaining))}
                >
                  Valor total
                </Button>
                {remaining > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPaymentAmount(String(Math.round((remaining / 2) * 100) / 100))}
                  >
                    Metade
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Pode pagar parcial para adiantar e liberar limite. O saldo restante permanece na fatura.
              </p>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button fullWidth onClick={handlePay} disabled={paying}>
                {paying ? 'Processando...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {parseFloat(paymentAmount) >= remaining ? 'Pagar fatura' : 'Adiantar pagamento'}
                  </>
                )}
              </Button>
            </div>
          )}

          {activeInvoice.status === 'paid' && activeInvoice.paidAt && (
            <p className="text-sm text-green-600">
              Paga em {formatDate(activeInvoice.paidAt)}
              {paidSoFar > 0 && ` · ${formatCurrency(paidSoFar)}`}
            </p>
          )}
        </Card>
      )}

      <div>
        <h2 className="font-semibold text-gray-900 mb-2">
          Gastos da fatura
          {invoiceTransactions.length > 0 && (
            <span className="text-sm font-normal text-gray-400"> · {invoiceTransactions.length}</span>
          )}
        </h2>
        <div className="flex flex-col gap-5">
          {invoiceTransactions.length === 0 && (
            <Card>
              <p className="text-center text-gray-400 py-6">Nenhum gasto nesta fatura</p>
            </Card>
          )}
          {invoiceGroups.map((group) => (
            <section key={group.date} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-700 px-1">
                {formatDayHeader(group.date)}
              </h3>
              {group.items.map((tx) => {
                const cat = getCategory(tx.categoryId)
                const color = cat?.color ?? '#EF4444'
                return (
                  <Card
                    key={tx.id}
                    padding="sm"
                    className="flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/lancamentos/${tx.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/lancamentos/${tx.id}`)
                      }
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      <Icon name={cat?.icon ?? 'credit-card'} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {tx.description || getCategoryName(tx.categoryId)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getCategoryName(tx.categoryId)}
                        {tx.installment && ` · ${tx.installment.current}/${tx.installment.total}x`}
                        {tx.status === 'pending' && ' · Previsto'}
                      </p>
                    </div>
                    <p className="font-semibold text-red-500 shrink-0">
                      -{formatCurrency(tx.amount)}
                    </p>
                    <button
                      onClick={(e) => handleDeleteTx(tx, e)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      aria-label="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Card>
                )
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
