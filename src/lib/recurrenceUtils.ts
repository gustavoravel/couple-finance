import { toISODate } from '@/lib/format'
import type { Recurrence, RecurrenceFrequency } from '@/types'

function clampDay(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month, 0).getDate()
  return Math.min(day, lastDay)
}

export function advanceRunDate(fromDate: string, recurrence: Recurrence): string {
  const [y, m, d] = fromDate.split('-').map(Number)

  if (recurrence.frequency === 'weekly') {
    const date = new Date(y, m - 1, d + 7)
    return toISODate(date)
  }

  if (recurrence.frequency === 'yearly') {
    const day = recurrence.dayOfMonth ?? d
    const nextYear = y + 1
    const nextMonth = m
    const clamped = clampDay(nextYear, nextMonth, day)
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`
  }

  const day = recurrence.dayOfMonth ?? d
  let nextMonth = m + 1
  let nextYear = y
  if (nextMonth > 12) {
    nextMonth = 1
    nextYear += 1
  }
  const clamped = clampDay(nextYear, nextMonth, day)
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`
}

export function initialNextRunDate(
  frequency: RecurrenceFrequency,
  dayOfMonth?: number,
  dayOfWeek?: number,
): string {
  const today = new Date()
  const todayStr = toISODate(today)

  if (frequency === 'weekly' && dayOfWeek !== undefined) {
    const current = today.getDay()
    let diff = dayOfWeek - current
    if (diff < 0) diff += 7
    if (diff === 0) return todayStr
    const next = new Date(today)
    next.setDate(today.getDate() + diff)
    return toISODate(next)
  }

  if (frequency === 'monthly' || frequency === 'yearly') {
    const day = dayOfMonth ?? today.getDate()
    const y = today.getFullYear()
    const m = today.getMonth() + 1
    const clamped = clampDay(y, m, day)
    const candidate = `${y}-${String(m).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`
    if (candidate >= todayStr) return candidate
    return advanceRunDate(candidate, {
      id: '',
      template: {} as Recurrence['template'],
      frequency,
      dayOfMonth: day,
      nextRunDate: candidate,
      active: true,
      createdBy: '',
    })
  }

  return todayStr
}

export const frequencyLabels: Record<RecurrenceFrequency, string> = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  yearly: 'Anual',
}

export const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
