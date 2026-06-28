import { createTransaction } from '@/services/transactionService'
import type { ParsedImportRow } from '@/lib/importUtils'

export async function importTransactions(
  householdId: string,
  rows: ParsedImportRow[],
  userId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  let imported = 0

  for (const row of rows) {
    await createTransaction(householdId, {
      type: row.type,
      amount: row.amount,
      date: row.date,
      description: row.description,
      categoryId: row.categoryId,
      subcategoryId: row.subcategoryId,
      paymentMethod: 'account',
      accountId: row.accountId,
      status: row.status,
      createdBy: userId,
    })
    imported++
    onProgress?.(imported, rows.length)
  }

  return imported
}
