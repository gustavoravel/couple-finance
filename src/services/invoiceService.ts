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
import { buildInvoiceDates } from '@/lib/invoiceUtils'
import { updateAccountBalance } from '@/services/accountService'
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
): Promise<void> {
  if (invoice.status === 'paid') {
    throw new Error('Fatura já paga')
  }
  if (invoice.total <= 0) {
    throw new Error('Fatura sem valor a pagar')
  }

  const transferRef = doc(collection(db, 'households', householdId, 'transfers'))
  await setDoc(transferRef, {
    fromAccountId: card.paymentAccountId,
    toAccountId: card.paymentAccountId,
    amount: invoice.total,
    date: paymentDate,
    description: `Pagamento fatura ${card.name}`,
    createdBy,
    kind: 'invoice_payment',
  })

  await updateAccountBalance(householdId, card.paymentAccountId, -invoice.total)

  await updateDoc(doc(db, 'households', householdId, 'invoices', invoice.id), {
    status: 'paid',
    paidAt: paymentDate,
    paidFromAccountId: card.paymentAccountId,
    paymentTransferId: transferRef.id,
  })
}

export async function getInvoice(
  householdId: string,
  invoiceId: string,
): Promise<Invoice | null> {
  const snap = await getDoc(doc(db, 'households', householdId, 'invoices', invoiceId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Invoice
}
