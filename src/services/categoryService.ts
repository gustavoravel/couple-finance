import { collection, onSnapshot, orderBy, query, type Unsubscribe } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Category } from '@/types'

export function subscribeCategories(
  householdId: string,
  callback: (categories: Category[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'households', householdId, 'categories'),
    orderBy('order'),
  )
  return onSnapshot(q, (snap) => {
    const categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category)
    callback(categories)
  })
}
