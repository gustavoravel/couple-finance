import { useEffect, useRef, useState } from 'react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { repairCardTransactionInvoiceLinks } from '@/services/cardTransactionRepair'

const STORAGE_PREFIX = 'couple-finance:card-links-repaired:v2:'

/**
 * Religa gastos de cartão antigos (sem invoiceId) às faturas,
 * para aparecerem em Cartões sem recadastrar.
 */
export function useCardInvoiceRepair() {
  const { household, cards, transactions, loading } = useHousehold()
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [linked, setLinked] = useState(0)
  const running = useRef(false)

  useEffect(() => {
    if (loading || !household || cards.length === 0 || running.current) return

    const orphans = transactions.filter(
      (t) => (t.paymentMethod === 'card' || t.cardId) && t.cardId && !t.invoiceId,
    )
    if (orphans.length === 0) {
      const key = STORAGE_PREFIX + household.id
      if (localStorage.getItem(key) === '1') setStatus('done')
      return
    }

    running.current = true
    setStatus('running')

    repairCardTransactionInvoiceLinks(household.id, cards, transactions)
      .then((result) => {
        setLinked(result.linked)
        localStorage.setItem(STORAGE_PREFIX + household.id, '1')
        setStatus('done')
      })
      .catch(() => {
        setStatus('error')
      })
      .finally(() => {
        running.current = false
      })
  }, [loading, household, cards, transactions])

  return { status, linked }
}
