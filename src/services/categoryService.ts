import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Category, CategoryKind, Subcategory } from '@/types'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

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

export interface CategoryInput {
  name: string
  kind: CategoryKind
  color: string
  icon: string
  order?: number
  subcategories?: Subcategory[]
}

export async function createCategory(
  householdId: string,
  data: CategoryInput,
): Promise<string> {
  const ref = doc(collection(db, 'households', householdId, 'categories'))
  const payload = {
    name: data.name.trim(),
    kind: data.kind,
    color: data.color,
    icon: data.icon,
    order: data.order ?? Date.now(),
    subcategories: data.subcategories ?? [],
  }
  await setDoc(ref, payload)
  return ref.id
}

export async function updateCategory(
  householdId: string,
  categoryId: string,
  data: Partial<Omit<Category, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'categories', categoryId), data)
}

export async function isCategoryInUse(
  householdId: string,
  categoryId: string,
): Promise<boolean> {
  const q = query(
    collection(db, 'households', householdId, 'transactions'),
    where('categoryId', '==', categoryId),
    limit(1),
  )
  const snap = await getDocs(q)
  return !snap.empty
}

export async function isSubcategoryInUse(
  householdId: string,
  subcategoryId: string,
): Promise<boolean> {
  const q = query(
    collection(db, 'households', householdId, 'transactions'),
    where('subcategoryId', '==', subcategoryId),
    limit(1),
  )
  const snap = await getDocs(q)
  return !snap.empty
}

export async function deleteCategory(
  householdId: string,
  categoryId: string,
): Promise<void> {
  if (await isCategoryInUse(householdId, categoryId)) {
    throw new Error('Categoria em uso em lançamentos. Remova ou altere os lançamentos antes.')
  }
  await deleteDoc(doc(db, 'households', householdId, 'categories', categoryId))
}

export function makeSubcategory(categoryName: string, subName: string): Subcategory {
  return {
    id: slugify(`${categoryName}-${subName}`),
    name: subName.trim(),
  }
}

export async function addSubcategory(
  householdId: string,
  category: Category,
  subName: string,
): Promise<Subcategory> {
  const name = subName.trim()
  if (!name) throw new Error('Nome da subcategoria é obrigatório')
  if (category.subcategories.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('Já existe uma subcategoria com este nome')
  }
  const sub = makeSubcategory(category.name, name)
  await updateCategory(householdId, category.id, {
    subcategories: [...category.subcategories, sub],
  })
  return sub
}

export async function renameSubcategory(
  householdId: string,
  category: Category,
  subcategoryId: string,
  newName: string,
): Promise<void> {
  const name = newName.trim()
  if (!name) throw new Error('Nome da subcategoria é obrigatório')
  const subcategories = category.subcategories.map((s) =>
    s.id === subcategoryId ? { ...s, name } : s,
  )
  await updateCategory(householdId, category.id, { subcategories })
}

export async function removeSubcategory(
  householdId: string,
  category: Category,
  subcategoryId: string,
): Promise<void> {
  if (await isSubcategoryInUse(householdId, subcategoryId)) {
    throw new Error('Subcategoria em uso em lançamentos. Altere os lançamentos antes.')
  }
  await updateCategory(householdId, category.id, {
    subcategories: category.subcategories.filter((s) => s.id !== subcategoryId),
  })
}
