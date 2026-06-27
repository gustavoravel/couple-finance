import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Budget } from '@/types'

export function subscribeBudgets(
  householdId: string,
  callback: (budgets: Budget[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'households', householdId, 'budgets'),
    orderBy('categoryId', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    const budgets = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Budget)
    callback(budgets)
  })
}

export async function createBudget(
  householdId: string,
  data: Omit<Budget, 'id'>,
): Promise<string> {
  const ref = doc(collection(db, 'households', householdId, 'budgets'))
  await setDoc(ref, data)
  return ref.id
}

export async function updateBudget(
  householdId: string,
  budgetId: string,
  data: Partial<Budget>,
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'budgets', budgetId), data)
}

export async function deleteBudget(householdId: string, budgetId: string): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'budgets', budgetId))
}
