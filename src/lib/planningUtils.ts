import { getMonthKey } from '@/lib/format'
import type { Account, Budget, Goal, Transaction } from '@/types'

export function averageMonthlyExpense(transactions: Transaction[], months = 6): number {
  const now = new Date()
  const totals: number[] = []

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = getMonthKey(d)
    const total = transactions
      .filter((t) => t.type === 'expense' && t.status === 'paid' && t.date.startsWith(key))
      .reduce((s, t) => s + t.amount, 0)
    totals.push(total)
  }

  const nonZero = totals.filter((t) => t > 0)
  if (nonZero.length === 0) return 0
  return nonZero.reduce((s, t) => s + t, 0) / nonZero.length
}

export function emergencyCoverageMonths(balance: number, avgExpense: number): number {
  if (avgExpense <= 0) return 0
  return balance / avgExpense
}

export function emergencyTargetAmount(targetMonths: number, avgExpense: number): number {
  return targetMonths * avgExpense
}

export function goalCurrentAmount(goal: Goal, accounts: Account[]): number {
  if (goal.linkedAccountId) {
    const account = accounts.find((a) => a.id === goal.linkedAccountId)
    return account?.currentBalance ?? 0
  }
  return goal.currentAmount
}

export function goalProgress(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, (current / target) * 100)
}

export function suggestedMonthlyContribution(
  current: number,
  target: number,
  targetDate: string,
): number {
  const today = new Date()
  const end = new Date(targetDate + 'T12:00:00')
  const monthsLeft = Math.max(
    1,
    (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth()),
  )
  const remaining = Math.max(0, target - current)
  return Math.round((remaining / monthsLeft) * 100) / 100
}

export function getEffectiveBudgets(budgets: Budget[], monthKey: string): Map<string, number> {
  const result = new Map<string, number>()

  for (const b of budgets.filter((b) => b.recurring)) {
    result.set(b.categoryId, b.plannedAmount)
  }
  for (const b of budgets.filter((b) => !b.recurring && b.competencia === monthKey)) {
    result.set(b.categoryId, b.plannedAmount)
  }

  return result
}

export function categorySpent(
  transactions: Transaction[],
  categoryId: string,
  monthKey: string,
): number {
  return transactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.status === 'paid' &&
        t.categoryId === categoryId &&
        t.date.startsWith(monthKey),
    )
    .reduce((s, t) => s + t.amount, 0)
}

export interface BudgetStatus {
  categoryId: string
  planned: number
  spent: number
  pct: number
  overBudget: boolean
}

export function budgetStatuses(
  budgets: Budget[],
  transactions: Transaction[],
  monthKey: string,
): BudgetStatus[] {
  const effective = getEffectiveBudgets(budgets, monthKey)
  return Array.from(effective.entries()).map(([categoryId, planned]) => {
    const spent = categorySpent(transactions, categoryId, monthKey)
    const pct = planned > 0 ? (spent / planned) * 100 : 0
    return { categoryId, planned, spent, pct, overBudget: spent > planned }
  })
}
