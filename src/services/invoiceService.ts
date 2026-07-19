import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { buildInvoiceDates, getInvoiceRemaining } from '@/lib/invoiceUtils'
import { createInvoicePayment } from '@/services/transferService'
import type { CreditCard, Invoice } from '@/types'

export function subscribeInvoices(
  householdId: string,
  callback: (invoices: Invoice[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'households', householdId, 'invoices'),
    orderBy('competencia', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    const invoices = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invoice)
    callback(invoices)
  })
}

export function subscribeInvoicesByCard(
  householdId: string,
  cardId: string,
  callback: (invoices: Invoice[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'households', householdId, 'invoices'),
    where('cardId', '==', cardId),
    orderBy('competencia', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    const invoices = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invoice)
    callback(invoices)
  })
}

export async function getOrCreateInvoice(
  householdId: string,
  card: CreditCard,
  competencia: string,
): Promise<string> {
  const invoicesRef = collection(db, 'households', householdId, 'invoices')
  const q = query(invoicesRef, where('cardId', '==', card.id), where('competencia', '==', competencia))
  const existing = await getDocs(q)

  if (!existing.empty) {
    return existing.docs[0].id
  }

  const dates = buildInvoiceDates(competencia, card)
  const ref = doc(invoicesRef)
  const invoice: Omit<Invoice, 'id'> = {
    cardId: card.id,
    competencia: dates.competencia,
    closingDate: dates.closingDate,
    dueDate: dates.dueDate,
    total: 0,
    status: 'open',
  }
  await setDoc(ref, invoice)
  return ref.id
}

export async function addToInvoiceTotal(
  householdId: string,
  invoiceId: string,
  amount: number,
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'invoices', invoiceId), {
    total: increment(amount),
  })
}

export async function payInvoice(
  householdId: string,
  invoice: Invoice,
  card: CreditCard,
  createdBy: string,
  paymentDate: string,
  amount?: number,
): Promise<void> {
  if (invoice.status === 'paid') {
    throw new Error('Fatura já paga')
  }

  const remaining = getInvoiceRemaining(invoice)
  if (remaining <= 0) {
    throw new Error('Fatura sem valor a pagar')
  }

  const paymentAmount =
    amount === undefined
      ? remaining
      : Math.round(amount * 100) / 100

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Informe um valor válido para pagar')
  }
  if (paymentAmount > remaining) {
    throw new Error(`Valor maior que o saldo da fatura (${remaining.toFixed(2)})`)
  }

  const isFull = paymentAmount >= remaining
  const transferId = await createInvoicePayment(householdId, {
    fromAccountId: card.paymentAccountId,
    cardId: card.id,
    amount: paymentAmount,
    date: paymentDate,
    description: isFull
      ? `Pagamento fatura ${card.name}`
      : `Adiantamento fatura ${card.name}`,
    createdBy,
  })

  const newPaidAmount = Math.round(((invoice.paidAmount ?? 0) + paymentAmount) * 100) / 100

  if (isFull) {
    await updateDoc(doc(db, 'households', householdId, 'invoices', invoice.id), {
      paidAmount: newPaidAmount,
      paidFromAccountId: card.paymentAccountId,
      paymentTransferId: transferId,
      status: 'paid',
      paidAt: paymentDate,
    })
  } else {
    await updateDoc(doc(db, 'households', householdId, 'invoices', invoice.id), {
      paidAmount: newPaidAmount,
      paidFromAccountId: card.paymentAccountId,
      paymentTransferId: transferId,
    })
  }
}

export async function closeDueInvoices(householdId: string, invoices: Invoice[]): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  let closed = 0

  for (const inv of invoices) {
    if (inv.status === 'open' && inv.closingDate <= today) {
      await updateDoc(doc(db, 'households', householdId, 'invoices', inv.id), { status: 'closed' })
      closed++
    }
  }

  return closed
}

export async function getInvoice(
  householdId: string,
  invoiceId: string,
): Promise<Invoice | null> {
  const snap = await getDoc(doc(db, 'households', householdId, 'invoices', invoiceId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Invoice
}
