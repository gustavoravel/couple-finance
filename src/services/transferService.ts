import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { updateAccountBalance } from '@/services/accountService'
import type { Transfer } from '@/types'

export function subscribeTransfers(
  householdId: string,
  callback: (transfers: Transfer[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'households', householdId, 'transfers'),
    orderBy('date', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    const transfers = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transfer)
    callback(transfers)
  })
}

export async function createTransfer(
  householdId: string,
  data: Omit<Transfer, 'id'>,
): Promise<string> {
  if (data.kind !== 'transfer') {
    throw new Error('Use createInvoicePayment para pagamento de fatura')
  }
  if (!data.toAccountId || data.fromAccountId === data.toAccountId) {
    throw new Error('Contas de origem e destino devem ser diferentes')
  }

  const ref = doc(collection(db, 'households', householdId, 'transfers'))
  await setDoc(ref, data)

  await updateAccountBalance(householdId, data.fromAccountId, -data.amount)
  await updateAccountBalance(householdId, data.toAccountId, data.amount)

  return ref.id
}

export interface InvoicePaymentInput {
  fromAccountId: string
  cardId: string
  amount: number
  date: string
  description: string
  createdBy: string
}

export async function createInvoicePayment(
  householdId: string,
  data: InvoicePaymentInput,
): Promise<string> {
  const ref = doc(collection(db, 'households', householdId, 'transfers'))
  await setDoc(ref, {
    fromAccountId: data.fromAccountId,
    cardId: data.cardId,
    amount: data.amount,
    date: data.date,
    description: data.description,
    createdBy: data.createdBy,
    kind: 'invoice_payment',
  })

  await updateAccountBalance(householdId, data.fromAccountId, -data.amount)

  return ref.id
}

export async function deleteTransfer(householdId: string, transfer: Transfer): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'transfers', transfer.id))

  if (transfer.kind === 'transfer' && transfer.toAccountId) {
    await updateAccountBalance(householdId, transfer.fromAccountId, transfer.amount)
    await updateAccountBalance(householdId, transfer.toAccountId, -transfer.amount)
  }

  if (transfer.kind === 'invoice_payment') {
    await updateAccountBalance(householdId, transfer.fromAccountId, transfer.amount)
  }
}
