import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '@/lib/firebase'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function uploadAttachment(
  householdId: string,
  transactionId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato não suportado. Use JPG, PNG, WebP ou PDF.')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Arquivo muito grande. Máximo 5 MB.')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `households/${householdId}/attachments/${transactionId}/${safeName}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
