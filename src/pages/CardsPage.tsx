import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { createCard } from '@/services/cardService'
import { getCardUsedLimit, getInvoiceRemaining } from '@/lib/invoiceUtils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/format'

const cardColors = ['#7F3DFF', '#3B82F6', '#EC4899', '#F59E0B', '#6366F1', '#14B8A6']

export function CardsPage() {
  const { user } = useAuth()
  const { household, accounts, cards, invoices } = useHousehold()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [limit, setLimit] = useState('')
  const [closingDay, setClosingDay] = useState('1')
  const [dueDay, setDueDay] = useState('10')
  const [paymentAccountId, setPaymentAccountId] = useState(accounts[0]?.id ?? '')
  const [loading, setLoading] = useState(false)

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }))

  const handleCreate = async () => {
    if (!household || !user || !name.trim() || !paymentAccountId) return
    setLoading(true)
    await createCard(household.id, {
      name: name.trim(),
      brand: brand.trim() || 'Outro',
      limit: parseFloat(limit) || 0,
      closingDay: Number(closingDay),
      dueDay: Number(dueDay),
      paymentAccountId,
      ownerUid: 'shared',
      color: cardColors[cards.length % cardColors.length],
      icon: 'credit-card',
    })
    setName('')
    setBrand('')
    setLimit('')
    setShowForm(false)
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cartões</h1>
          <p className="text-sm text-gray-500">{cards.length} cartão(ões)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          Novo
        </Button>
      </header>

      {showForm && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Novo cartão</h2>
          <div className="flex flex-col gap-3">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank Ultravioleta" />
            <Input label="Bandeira" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex.: Mastercard" />
            <Input
              label="Limite (R$)"
              type="number"
              step="0.01"
              min="0"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Dia fechamento"
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
              <Input
                label="Dia vencimento"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
            <Select
              label="Conta para pagamento"
              options={
                accountOptions.length
                  ? accountOptions
                  : [{ value: '', label: 'Cadastre uma conta primeiro' }]
              }
              value={paymentAccountId}
              onChange={(e) => setPaymentAccountId(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button
                fullWidth
                onClick={handleCreate}
                disabled={loading || !name.trim() || !paymentAccountId}
              >
                {loading ? 'Criando...' : 'Criar cartão'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {cards.length === 0 && !showForm && (
          <Card>
            <p className="text-center text-gray-400 py-8">Nenhum cartão cadastrado</p>
          </Card>
        )}
        {cards.map((card) => {
          const used = getCardUsedLimit(invoices, card.id)
          const available = card.limit - used
          const usagePct = card.limit > 0 ? (used / card.limit) * 100 : 0
          const openInvoice = invoices.find((inv) => inv.cardId === card.id && inv.status === 'open')

          return (
            <Link key={card.id} to={`/cartoes/${card.id}`}>
              <Card padding="sm" className="flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${card.color}20`, color: card.color }}
                  >
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{card.name}</p>
                    <p className="text-xs text-gray-400">
                      Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">{formatCurrency(used)}</p>
                    <p className="text-xs text-gray-400">de {formatCurrency(card.limit)}</p>
                  </div>
                </div>
                <div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${usagePct > 80 ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(100, usagePct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Disponível: {formatCurrency(Math.max(0, available))}
                    {openInvoice && getInvoiceRemaining(openInvoice) > 0 && (
                      <> · Fatura aberta: {formatCurrency(getInvoiceRemaining(openInvoice))}</>
                    )}
                  </p>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
