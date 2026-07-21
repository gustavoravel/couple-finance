import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getOrCreateInvoice, addToInvoiceTotal } from '@/services/invoiceService'
import { addMonthsToCompetencia, getInvoiceCompetencia } from '@/lib/invoiceUtils'
import type { CreditCard, Transaction } from '@/types'

export interface CardLinkRepairResult {
  linked: number
  alreadyLinked: number
  skipped: number
}

/**
 * Ensures every card purchase has an invoiceId so it appears under Cartões → fatura.
 * Safe to run multiple times (idempotent for txs that already have invoiceId).
 */
export async function repairCardTransactionInvoiceLinks(
  householdId: string,
  cards: CreditCard[],
  transactions: Transaction[],
): Promise<CardLinkRepairResult> {
  const cardMap = new Map(cards.map((c) => [c.id, c]))
  let linked = 0
  let alreadyLinked = 0
  let skipped = 0

  // Card purchases: explicit paymentMethod, or legacy docs that only have cardId
  const cardTxs = transactions.filter(
    (t) => t.cardId && (t.paymentMethod === 'card' || t.paymentMethod == null || !t.accountId),
  )

  for (const tx of cardTxs) {
    if (tx.invoiceId && tx.paymentMethod === 'card') {
      alreadyLinked++
      continue
    }

    const card = cardMap.get(tx.cardId!)
    if (!card) {
      skipped++
      continue
    }

    let invoiceId = tx.invoiceId
    if (!invoiceId) {
      let competencia: string
      if (tx.installment && tx.installment.total > 1) {
        const monthsBack = tx.installment.current - 1
        const purchaseDate = addMonthsToDateSafe(tx.date, -monthsBack)
        const firstComp = getInvoiceCompetencia(purchaseDate, card.closingDay)
        competencia = addMonthsToCompetencia(firstComp, monthsBack)
      } else {
        competencia = getInvoiceCompetencia(tx.date, card.closingDay)
      }
      invoiceId = await getOrCreateInvoice(householdId, card, competencia)
    }

    await updateDoc(doc(db, 'households', householdId, 'transactions', tx.id), {
      invoiceId,
      cardId: card.id,
      paymentMethod: 'card',
    })

    if (!tx.invoiceId && tx.status === 'paid') {
      await addToInvoiceTotal(householdId, invoiceId, tx.amount)
    }

    linked++
  }

  return { linked, alreadyLinked, skipped }
}

function addMonthsToDateSafe(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1 + months, 1)
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const lastDay = new Date(y, m, 0).getDate()
  const d = Math.min(day, lastDay)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Count card purchases per invoice for UI badges. */
export function countTransactionsByInvoice(
  transactions: Transaction[],
  invoiceIds: string[],
): Record<string, number> {
  const set = new Set(invoiceIds)
  const counts: Record<string, number> = {}
  for (const id of invoiceIds) counts[id] = 0
  for (const tx of transactions) {
    if (tx.invoiceId && set.has(tx.invoiceId)) {
      counts[tx.invoiceId] = (counts[tx.invoiceId] ?? 0) + 1
    }
  }
  return counts
}

export async function listCardTransactionsFromFirestore(
  householdId: string,
): Promise<Transaction[]> {
  const snap = await getDocs(collection(db, 'households', householdId, 'transactions'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Transaction)
    .filter((t) => t.paymentMethod === 'card')
}
