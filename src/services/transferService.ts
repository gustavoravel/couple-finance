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
  if (data.fromAccountId === data.toAccountId) {
    throw new Error('Contas de origem e destino devem ser diferentes')
  }

  const ref = doc(collection(db, 'households', householdId, 'transfers'))
  await setDoc(ref, data)

  await updateAccountBalance(householdId, data.fromAccountId, -data.amount)
  await updateAccountBalance(householdId, data.toAccountId, data.amount)

  return ref.id
}

export async function deleteTransfer(householdId: string, transfer: Transfer): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'transfers', transfer.id))

  if (transfer.kind === 'transfer') {
    await updateAccountBalance(householdId, transfer.fromAccountId, transfer.amount)
    await updateAccountBalance(householdId, transfer.toAccountId, -transfer.amount)
  }
}
