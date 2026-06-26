import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Account } from '@/types'

export function subscribeAccounts(
  householdId: string,
  callback: (accounts: Account[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'households', householdId, 'accounts'),
    orderBy('name'),
  )
  return onSnapshot(q, (snap) => {
    const accounts = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Account)
    callback(accounts)
  })
}

export async function createAccount(
  householdId: string,
  data: Omit<Account, 'id'>,
): Promise<string> {
  const ref = doc(collection(db, 'households', householdId, 'accounts'))
  await setDoc(ref, data)
  return ref.id
}

export async function updateAccount(
  householdId: string,
  accountId: string,
  data: Partial<Account>,
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'accounts', accountId), data)
}

export async function updateAccountBalance(
  householdId: string,
  accountId: string,
  delta: number,
): Promise<void> {
  const ref = doc(db, 'households', householdId, 'accounts', accountId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const current = snap.data().currentBalance as number
  await updateDoc(ref, { currentBalance: current + delta })
}
