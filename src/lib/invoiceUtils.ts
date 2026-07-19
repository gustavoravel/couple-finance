import type { CreditCard } from '@/types'

export function getInvoiceCompetencia(purchaseDate: string, closingDay: number): string {
  const [year, month, day] = purchaseDate.split('-').map(Number)
  let compYear = year
  let compMonth = month

  if (day > closingDay) {
    compMonth += 1
    if (compMonth > 12) {
      compMonth = 1
      compYear += 1
    }
  }

  return `${compYear}-${String(compMonth).padStart(2, '0')}`
}

export function addMonthsToCompetencia(competencia: string, months: number): string {
  const [year, month] = competencia.split('-').map(Number)
  const date = new Date(year, month - 1 + months, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Advance a YYYY-MM-DD by N calendar months, clamping the day. */
export function addMonthsToDate(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1 + months, 1)
  const nextYear = date.getFullYear()
  const nextMonth = date.getMonth() + 1
  const clamped = clampDay(nextYear, nextMonth, day)
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`
}

export function clampDay(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month, 0).getDate()
  return Math.min(day, lastDay)
}

/** Date for a card installment in the invoice competência month (keeps purchase day-of-month). */
export function dateInCompetencia(competencia: string, purchaseDate: string): string {
  const [, , purchaseDay] = purchaseDate.split('-').map(Number)
  const [year, month] = competencia.split('-').map(Number)
  const day = clampDay(year, month, purchaseDay)
  return `${competencia}-${String(day).padStart(2, '0')}`
}

export function getClosingDate(competencia: string, closingDay: number): string {
  const [year, month] = competencia.split('-').map(Number)
  const day = clampDay(year, month, closingDay)
  return `${competencia}-${String(day).padStart(2, '0')}`
}

export function getDueDate(competencia: string, dueDay: number): string {
  const [year, month] = competencia.split('-').map(Number)
  let dueYear = year
  let dueMonth = month + 1
  if (dueMonth > 12) {
    dueMonth = 1
    dueYear += 1
  }
  const day = clampDay(dueYear, dueMonth, dueDay)
  return `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatCompetencia(competencia: string): string {
  const [year, month] = competencia.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function getInvoiceRemaining(invoice: {
  total: number
  paidAmount?: number
}): number {
  const paid = invoice.paidAmount ?? 0
  return Math.max(0, Math.round((invoice.total - paid) * 100) / 100)
}

export function getCardUsedLimit(
  invoices: Array<{ cardId: string; total: number; paidAmount?: number; status: string }>,
  cardId: string,
): number {
  return invoices
    .filter((inv) => inv.cardId === cardId && inv.status !== 'paid')
    .reduce((sum, inv) => sum + getInvoiceRemaining(inv), 0)
}

export function buildInvoiceDates(competencia: string, card: CreditCard) {
  return {
    competencia,
    closingDate: getClosingDate(competencia, card.closingDay),
    dueDate: getDueDate(competencia, card.dueDay),
  }
}
