import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { buildCategorySeed } from '@/data/categorySeed'
import { generateInviteCode } from '@/lib/format'
import type { Household, UserProfile } from '@/types'

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return snap.data() as UserProfile
}

export async function upsertUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await setDoc(doc(db, 'users', uid), data, { merge: true })
}

export async function createHousehold(uid: string, name: string): Promise<string> {
  const householdRef = doc(collection(db, 'households'))
  const inviteCode = generateInviteCode()
  const household: Omit<Household, 'id'> = {
    name,
    members: [uid],
    currency: 'BRL',
    inviteCode,
    createdAt: new Date().toISOString(),
  }

  const batch = writeBatch(db)
  batch.set(householdRef, household)
  batch.set(doc(db, 'inviteCodes', inviteCode), { householdId: householdRef.id })
  batch.set(doc(db, 'users', uid), { householdId: householdRef.id }, { merge: true })

  const categories = buildCategorySeed()
  for (const cat of categories) {
    const catRef = doc(collection(db, 'households', householdRef.id, 'categories'))
    batch.set(catRef, cat)
  }

  await batch.commit()
  return householdRef.id
}

export async function joinHousehold(uid: string, inviteCode: string): Promise<string> {
  const code = inviteCode.toUpperCase()
  const inviteSnap = await getDoc(doc(db, 'inviteCodes', code))

  if (!inviteSnap.exists()) {
    throw new Error('Código de convite inválido')
  }

  const householdId = inviteSnap.data().householdId as string
  const householdDoc = await getDoc(doc(db, 'households', householdId))
  if (!householdDoc.exists()) {
    throw new Error('Lar não encontrado')
  }

  const household = householdDoc.data() as Omit<Household, 'id'>

  if (household.members.includes(uid)) {
    await setDoc(doc(db, 'users', uid), { householdId }, { merge: true })
    return householdId
  }

  if (household.members.length >= 2) {
    throw new Error('Este lar já tem o número máximo de membros')
  }

  const batch = writeBatch(db)
  batch.update(doc(db, 'households', householdId), { members: [...household.members, uid] })
  batch.set(doc(db, 'users', uid), { householdId }, { merge: true })
  await batch.commit()

  return householdId
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const snap = await getDoc(doc(db, 'households', householdId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Household
}

export async function updateHouseholdName(householdId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { name })
}

export async function getMemberProfiles(
  memberUids: string[],
): Promise<Array<{ uid: string; name: string }>> {
  const profiles = await Promise.all(memberUids.map((uid) => getUserProfile(uid)))
  return memberUids.map((uid, i) => ({
    uid,
    name: profiles[i]?.displayName || profiles[i]?.email || 'Membro',
  }))
}
