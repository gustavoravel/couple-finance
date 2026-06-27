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
import type { Goal } from '@/types'

export function subscribeGoals(
  householdId: string,
  callback: (goals: Goal[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'households', householdId, 'goals'),
    orderBy('targetDate', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    const goals = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Goal)
    callback(goals)
  })
}

export async function createGoal(
  householdId: string,
  data: Omit<Goal, 'id'>,
): Promise<string> {
  const ref = doc(collection(db, 'households', householdId, 'goals'))
  await setDoc(ref, data)
  return ref.id
}

export async function updateGoal(
  householdId: string,
  goalId: string,
  data: Partial<Goal>,
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'goals', goalId), data)
}

export async function deleteGoal(householdId: string, goalId: string): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'goals', goalId))
}
