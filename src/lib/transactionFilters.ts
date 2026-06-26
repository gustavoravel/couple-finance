import { getMonthKey } from '@/lib/format'
import type { Transaction, Transfer } from '@/types'

export type PeriodMode = 'month' | 'year' | 'range'
export type TypeFilter = 'all' | 'income' | 'expense' | 'transfer'

export interface FilterState {
  periodMode: PeriodMode
  month: string
  year: number
  startDate: string
  endDate: string
  categoryId: string
  accountId: string
  createdBy: string
  type: TypeFilter
}

export function defaultFilters(): FilterState {
  const now = new Date()
  return {
    periodMode: 'month',
    month: getMonthKey(now),
    year: now.getFullYear(),
    startDate: '',
    endDate: '',
    categoryId: '',
    accountId: '',
    createdBy: '',
    type: 'all',
  }
}

function inPeriod(date: string, filters: FilterState): boolean {
  if (filters.periodMode === 'month') {
    return date.startsWith(filters.month)
  }
  if (filters.periodMode === 'year') {
    return date.startsWith(String(filters.year))
  }
  if (filters.startDate && date < filters.startDate) return false
  if (filters.endDate && date > filters.endDate) return false
  return true
}

export function filterTransactions(transactions: Transaction[], filters: FilterState): Transaction[] {
  return transactions.filter((t) => {
    if (!inPeriod(t.date, filters)) return false
    if (filters.categoryId && t.categoryId !== filters.categoryId) return false
    if (filters.accountId && t.accountId !== filters.accountId) return false
    if (filters.createdBy && t.createdBy !== filters.createdBy) return false
    if (filters.type === 'income' && t.type !== 'income') return false
    if (filters.type === 'expense' && t.type !== 'expense') return false
    if (filters.type === 'transfer') return false
    return true
  })
}

export function filterTransfers(transfers: Transfer[], filters: FilterState): Transfer[] {
  return transfers.filter((t) => {
    if (t.kind !== 'transfer') return false
    if (!inPeriod(t.date, filters)) return false
    if (filters.categoryId) return false
    if (filters.accountId && t.fromAccountId !== filters.accountId && t.toAccountId !== filters.accountId) {
      return false
    }
    if (filters.createdBy && t.createdBy !== filters.createdBy) return false
    if (filters.type === 'income' || filters.type === 'expense') return false
    return true
  })
}

export type ListItem =
  | { kind: 'transaction'; date: string; data: Transaction }
  | { kind: 'transfer'; date: string; data: Transfer }

export function mergeAndSort(
  transactions: Transaction[],
  transfers: Transfer[],
  filters: FilterState,
): ListItem[] {
  const txItems: ListItem[] = filterTransactions(transactions, filters).map((t) => ({
    kind: 'transaction' as const,
    date: t.date,
    data: t,
  }))
  const trItems: ListItem[] = filterTransfers(transfers, filters).map((t) => ({
    kind: 'transfer' as const,
    date: t.date,
    data: t,
  }))
  return [...txItems, ...trItems].sort((a, b) => b.date.localeCompare(a.date))
}

export function sumIncome(transactions: Transaction[], filters: FilterState): number {
  return filterTransactions(transactions, filters)
    .filter((t) => t.status === 'paid' && t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)
}

export function sumExpense(transactions: Transaction[], filters: FilterState): number {
  return filterTransactions(transactions, filters)
    .filter((t) => t.status === 'paid' && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
}

export function monthlySeries(
  transactions: Transaction[],
  year: number,
): Array<{ month: string; label: string; income: number; expense: number; surplus: number }> {
  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return labels.map((label, i) => {
    const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`
    const monthTx = transactions.filter((t) => t.date.startsWith(monthKey) && t.status === 'paid')
    const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { month: monthKey, label, income, expense, surplus: income - expense }
  })
}
