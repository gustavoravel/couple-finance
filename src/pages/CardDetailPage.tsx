import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, CheckCircle2, CreditCard } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { payInvoice } from '@/services/invoiceService'
import { getCardUsedLimit, formatCompetencia } from '@/lib/invoiceUtils'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate, toISODate } from '@/lib/format'
import type { Invoice } from '@/types'

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

export function CardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>()
  const { user } = useAuth()
  const { household, accounts, cards, invoices, transactions, categories } = useHousehold()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  const card = cards.find((c) => c.id === cardId)
  const cardInvoices = useMemo(
    () => invoices.filter((inv) => inv.cardId === cardId).sort((a, b) => a.competencia.localeCompare(b.competencia)),
    [invoices, cardId],
  )

  const activeInvoice = selectedInvoiceId
    ? cardInvoices.find((inv) => inv.id === selectedInvoiceId)
    : cardInvoices.find((inv) => inv.status !== 'paid') ?? cardInvoices[cardInvoices.length - 1]

  const invoiceTransactions = useMemo(
    () =>
      activeInvoice
        ? transactions.filter((t) => t.invoiceId === activeInvoice.id)
        : [],
    [transactions, activeInvoice],
  )

  const used = card ? getCardUsedLimit(invoices, card.id) : 0
  const paymentAccount = accounts.find((a) => a.id === card?.paymentAccountId)

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name ?? 'Sem categoria'

  const handlePay = async () => {
    if (!household || !user || !card || !activeInvoice) return
    if (!confirm(`Pagar fatura de ${formatCurrency(activeInvoice.total)}?`)) return

    setError('')
    setPaying(true)
    try {
      await payInvoice(household.id, activeInvoice, card, user.uid, toISODate(new Date()))
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
      <Link to="/cartoes" className="flex items-center gap-2 text-sm text-gray-500">
        <ArrowLeft className="w-4 h-4" />
        Cartões
      </Link>

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

          <p className="text-2xl font-bold text-gray-900 mb-4">
            {formatCurrency(activeInvoice.total)}
          </p>

          {activeInvoice.status !== 'paid' && activeInvoice.total > 0 && (
            <>
              {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
              <Button fullWidth onClick={handlePay} disabled={paying}>
                {paying ? 'Processando...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Pagar fatura
                  </>
                )}
              </Button>
            </>
          )}

          {activeInvoice.status === 'paid' && activeInvoice.paidAt && (
            <p className="text-sm text-green-600">
              Paga em {formatDate(activeInvoice.paidAt)}
            </p>
          )}
        </Card>
      )}

      <div>
        <h2 className="font-semibold text-gray-900 mb-2">Lançamentos da fatura</h2>
        <div className="flex flex-col gap-2">
          {invoiceTransactions.length === 0 && (
            <Card>
              <p className="text-center text-gray-400 py-6">Nenhum lançamento nesta fatura</p>
            </Card>
          )}
          {invoiceTransactions.map((tx) => (
            <Card key={tx.id} padding="sm" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-50 text-red-500">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {tx.description || getCategoryName(tx.categoryId)}
                </p>
                <p className="text-xs text-gray-400">
                  {getCategoryName(tx.categoryId)} · {formatDate(tx.date)}
                  {tx.installment && ` · ${tx.installment.current}/${tx.installment.total}x`}
                </p>
              </div>
              <p className="font-semibold text-red-500 shrink-0">
                -{formatCurrency(tx.amount)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
