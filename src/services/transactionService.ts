import {
  collection,
  doc,
  deleteDoc,
  getDocs,
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
import { addMonthsToCompetencia, dateInCompetencia, getInvoiceCompetencia } from '@/lib/invoiceUtils'
import type { CreditCard, Transaction } from '@/types'

export function stripInstallmentSuffix(description: string): string {
  return description.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim()
}

async function reversePaidEffects(householdId: string, tx: Transaction): Promise<void> {
  if (tx.status !== 'paid') return

  if (tx.paymentMethod === 'account' && tx.accountId) {
    const delta = tx.type === 'income' ? -tx.amount : tx.amount
    await updateAccountBalance(householdId, tx.accountId, delta)
  }

  if (tx.paymentMethod === 'card' && tx.invoiceId) {
    await addToInvoiceTotal(householdId, tx.invoiceId, -tx.amount)
  }
}

async function applyPaidEffects(householdId: string, tx: Transaction): Promise<void> {
  if (tx.status !== 'paid') return

  if (tx.paymentMethod === 'account' && tx.accountId) {
    const delta = tx.type === 'income' ? tx.amount : -tx.amount
    await updateAccountBalance(householdId, tx.accountId, delta)
  }

  if (tx.paymentMethod === 'card' && tx.invoiceId) {
    await addToInvoiceTotal(householdId, tx.invoiceId, tx.amount)
  }
}

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

export interface TransactionEditInput {
  type: Transaction['type']
  amount: number
  date: string
  description: string
  categoryId: string
  subcategoryId?: string
  paymentMethod: Transaction['paymentMethod']
  accountId?: string
  cardId?: string
  status: Transaction['status']
}

/** Edit a single (non-group) transaction with balance/invoice side effects. */
export async function editTransaction(
  householdId: string,
  oldTx: Transaction,
  data: TransactionEditInput,
): Promise<void> {
  if (oldTx.installment && oldTx.installment.total > 1) {
    throw new Error('Use editInstallmentGroup para parcelas')
  }

  await reversePaidEffects(householdId, oldTx)

  const next: Transaction = {
    ...oldTx,
    type: data.type,
    amount: data.amount,
    date: data.date,
    description: data.description,
    categoryId: data.categoryId,
    subcategoryId: data.subcategoryId,
    paymentMethod: data.paymentMethod,
    accountId: data.paymentMethod === 'account' ? data.accountId : undefined,
    cardId: data.paymentMethod === 'card' ? oldTx.cardId : undefined,
    invoiceId: data.paymentMethod === 'card' ? oldTx.invoiceId : undefined,
    status: data.status,
  }

  await updateDoc(doc(db, 'households', householdId, 'transactions', oldTx.id), {
    type: next.type,
    amount: next.amount,
    date: next.date,
    description: next.description,
    categoryId: next.categoryId,
    subcategoryId: next.subcategoryId ?? null,
    paymentMethod: next.paymentMethod,
    accountId: next.accountId ?? null,
    cardId: next.cardId ?? null,
    invoiceId: next.invoiceId ?? null,
    status: next.status,
  })

  await applyPaidEffects(householdId, next)
}

export interface InstallmentGroupEditInput {
  description: string
  categoryId: string
  subcategoryId?: string
  status: Transaction['status']
  /** Total amount for the whole group (will be split across parcels). */
  amountTotal: number
}

export async function getInstallmentGroup(
  householdId: string,
  groupId: string,
): Promise<Transaction[]> {
  const q = query(
    collection(db, 'households', householdId, 'transactions'),
    where('installment.groupId', '==', groupId),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Transaction)
    .sort((a, b) => (a.installment?.current ?? 0) - (b.installment?.current ?? 0))
}

export async function editInstallmentGroup(
  householdId: string,
  anyParcel: Transaction,
  data: InstallmentGroupEditInput,
): Promise<void> {
  const groupId = anyParcel.installment?.groupId
  if (!groupId || !anyParcel.installment) {
    throw new Error('Lançamento não faz parte de um grupo de parcelas')
  }

  const group = await getInstallmentGroup(householdId, groupId)
  if (group.length === 0) throw new Error('Grupo de parcelas não encontrado')

  const total = anyParcel.installment.total
  const parcelAmount = Math.round((data.amountTotal / total) * 100) / 100
  const baseDescription = stripInstallmentSuffix(data.description)

  for (const tx of group) {
    await reversePaidEffects(householdId, tx)

    const current = tx.installment?.current ?? 1
    const description = `${baseDescription} (${current}/${total})`.trim()
    const next: Transaction = {
      ...tx,
      amount: parcelAmount,
      description,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      status: data.status,
    }

    await updateDoc(doc(db, 'households', householdId, 'transactions', tx.id), {
      amount: next.amount,
      description: next.description,
      categoryId: next.categoryId,
      subcategoryId: next.subcategoryId ?? null,
      status: next.status,
    })

    await applyPaidEffects(householdId, next)
  }
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
    const installmentDate = dateInCompetencia(competencia, data.date)

    const tx: Omit<Transaction, 'id'> = {
      type: data.type,
      amount: installmentAmount,
      date: installmentDate,
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
