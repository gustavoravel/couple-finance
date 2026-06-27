import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { updateAccountBalance } from '@/services/accountService'
import { addToInvoiceTotal, getOrCreateInvoice } from '@/services/invoiceService'
import { addMonthsToCompetencia, getInvoiceCompetencia } from '@/lib/invoiceUtils'
import type { CreditCard, Transaction } from '@/types'

export function subscribeTransactions(
  householdId: string,
  callback: (transactions: Transaction[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'households', householdId, 'transactions'),
    orderBy('date', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    const transactions = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction)
    callback(transactions)
  })
}

export function subscribeTransactionsByMonth(
  householdId: string,
  monthKey: string,
  callback: (transactions: Transaction[]) => void,
): Unsubscribe {
  const start = `${monthKey}-01`
  const [year, month] = monthKey.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${monthKey}-${String(lastDay).padStart(2, '0')}`

  const q = query(
    collection(db, 'households', householdId, 'transactions'),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    const transactions = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction)
    callback(transactions)
  })
}

export async function createTransaction(
  householdId: string,
  data: Omit<Transaction, 'id'>,
): Promise<string> {
  const ref = doc(collection(db, 'households', householdId, 'transactions'))
  await setDoc(ref, data)

  if (data.status === 'paid' && data.paymentMethod === 'account' && data.accountId) {
    const delta = data.type === 'income' ? data.amount : -data.amount
    await updateAccountBalance(householdId, data.accountId, delta)
  }

  if (data.status === 'paid' && data.paymentMethod === 'card' && data.invoiceId) {
    await addToInvoiceTotal(householdId, data.invoiceId, data.amount)
  }

  return ref.id
}

export async function updateTransaction(
  householdId: string,
  transactionId: string,
  data: Partial<Transaction>,
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'transactions', transactionId), data)
}

export interface CardTransactionInput {
  type: 'expense'
  amount: number
  date: string
  description: string
  categoryId: string
  subcategoryId?: string
  cardId: string
  status: Transaction['status']
  createdBy: string
  installments?: number
}

export async function createCardTransaction(
  householdId: string,
  card: CreditCard,
  data: CardTransactionInput,
): Promise<string[]> {
  const installmentCount = Math.max(1, data.installments ?? 1)
  const installmentAmount = Math.round((data.amount / installmentCount) * 100) / 100
  const groupId = doc(collection(db, 'households', householdId, 'transactions')).id
  const ids: string[] = []

  let competencia = getInvoiceCompetencia(data.date, card.closingDay)

  for (let i = 0; i < installmentCount; i++) {
    const invoiceId = await getOrCreateInvoice(householdId, card, competencia)
    const txRef = doc(collection(db, 'households', householdId, 'transactions'))

    const tx: Omit<Transaction, 'id'> = {
      type: data.type,
      amount: installmentAmount,
      date: data.date,
      description:
        installmentCount > 1
          ? `${data.description} (${i + 1}/${installmentCount})`.trim()
          : data.description,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      paymentMethod: 'card',
      cardId: card.id,
      invoiceId,
      status: data.status,
      installment:
        installmentCount > 1
          ? { groupId, current: i + 1, total: installmentCount }
          : null,
      createdBy: data.createdBy,
    }

    await setDoc(txRef, tx)
    ids.push(txRef.id)

    if (data.status === 'paid') {
      await addToInvoiceTotal(householdId, invoiceId, installmentAmount)
    }

    competencia = addMonthsToCompetencia(competencia, 1)
  }

  return ids
}

export async function deleteTransaction(
  householdId: string,
  transaction: Transaction,
): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'transactions', transaction.id))

  if (transaction.status === 'paid' && transaction.paymentMethod === 'account' && transaction.accountId) {
    const delta = transaction.type === 'income' ? -transaction.amount : transaction.amount
    await updateAccountBalance(householdId, transaction.accountId, delta)
  }

  if (transaction.status === 'paid' && transaction.paymentMethod === 'card' && transaction.invoiceId) {
    await addToInvoiceTotal(householdId, transaction.invoiceId, -transaction.amount)
  }
}
