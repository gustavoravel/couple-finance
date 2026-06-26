import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { updateAccountBalance } from '@/services/accountService'
import type { Transaction } from '@/types'

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

  return ref.id
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
}
