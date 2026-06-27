import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { CreditCard } from '@/types'

export function subscribeCards(
  householdId: string,
  callback: (cards: CreditCard[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'households', householdId, 'cards'),
    orderBy('name'),
  )
  return onSnapshot(q, (snap) => {
    const cards = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CreditCard)
    callback(cards)
  })
}

export async function createCard(
  householdId: string,
  data: Omit<CreditCard, 'id'>,
): Promise<string> {
  const ref = doc(collection(db, 'households', householdId, 'cards'))
  await setDoc(ref, data)
  return ref.id
}
