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
import { advanceRunDate } from '@/lib/recurrenceUtils'
import { createTransaction, createCardTransaction } from '@/services/transactionService'
import type { CreditCard, Recurrence } from '@/types'

export function subscribeRecurrences(
  householdId: string,
  callback: (recurrences: Recurrence[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'households', householdId, 'recurrences'),
    orderBy('nextRunDate', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    const recurrences = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Recurrence)
    callback(recurrences)
  })
}

export async function createRecurrence(
  householdId: string,
  data: Omit<Recurrence, 'id'>,
): Promise<string> {
  const ref = doc(collection(db, 'households', householdId, 'recurrences'))
  await setDoc(ref, data)
  return ref.id
}

export async function updateRecurrence(
  householdId: string,
  recurrenceId: string,
  data: Partial<Recurrence>,
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'recurrences', recurrenceId), data)
}

export async function deleteRecurrence(householdId: string, recurrenceId: string): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'recurrences', recurrenceId))
}

export async function processDueRecurrences(
  householdId: string,
  recurrences: Recurrence[],
  cards: CreditCard[],
  userId: string,
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  let processed = 0

  for (const rec of recurrences.filter((r) => r.active && r.nextRunDate <= today)) {
    let runDate = rec.nextRunDate
    let safety = 0

    while (runDate <= today && safety < 24) {
      await executeRecurrence(householdId, rec, runDate, cards, userId)
      runDate = advanceRunDate(runDate, rec)
      processed++
      safety++
    }

    await updateRecurrence(householdId, rec.id, { nextRunDate: runDate })
  }

  return processed
}

async function executeRecurrence(
  householdId: string,
  rec: Recurrence,
  runDate: string,
  cards: CreditCard[],
  userId: string,
): Promise<void> {
  const { template } = rec

  if (template.paymentMethod === 'card' && template.cardId) {
    const card = cards.find((c) => c.id === template.cardId)
    if (!card) return
    await createCardTransaction(householdId, card, {
      type: 'expense',
      amount: template.amount,
      date: runDate,
      description: template.description,
      categoryId: template.categoryId,
      subcategoryId: template.subcategoryId,
      cardId: template.cardId,
      status: template.status,
      createdBy: userId,
      installments: 1,
    })
    return
  }

  await createTransaction(householdId, {
    type: template.type,
    amount: template.amount,
    date: runDate,
    description: template.description,
    categoryId: template.categoryId,
    subcategoryId: template.subcategoryId,
    paymentMethod: 'account',
    accountId: template.accountId,
    status: template.status,
    recurrenceId: rec.id,
    createdBy: userId,
  })
}
