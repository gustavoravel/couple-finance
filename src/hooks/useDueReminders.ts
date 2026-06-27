import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { formatCurrency, formatDate } from '@/lib/format'

const STORAGE_KEY = 'fincasal_last_reminders'

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T12:00:00')
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function wasNotifiedRecently(key: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const map: Record<string, string> = raw ? JSON.parse(raw) : {}
    const last = map[key]
    if (!last) return false
    return last === new Date().toISOString().slice(0, 10)
  } catch {
    return false
  }
}

function markNotified(key: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const map: Record<string, string> = raw ? JSON.parse(raw) : {}
    map[key] = new Date().toISOString().slice(0, 10)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function useDueReminders() {
  const { profile } = useAuth()
  const { invoices, cards } = useHousehold()

  useEffect(() => {
    if (!profile?.preferences?.notificationsEnabled) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const daysBefore = profile.preferences.reminderDaysBefore ?? 3

    for (const inv of invoices) {
      if (inv.status === 'paid' || inv.total <= 0) continue

      const days = daysUntil(inv.dueDate)
      if (days > daysBefore || days < -7) continue

      const key = `invoice-${inv.id}-${inv.dueDate}`
      if (wasNotifiedRecently(key)) continue

      const card = cards.find((c) => c.id === inv.cardId)
      const title = days < 0 ? 'Fatura vencida' : days === 0 ? 'Fatura vence hoje' : 'Fatura próxima do vencimento'
      const body =
        days < 0
          ? `${card?.name ?? 'Cartão'}: ${formatCurrency(inv.total)} — venceu em ${formatDate(inv.dueDate)}`
          : `${card?.name ?? 'Cartão'}: ${formatCurrency(inv.total)} — vence em ${formatDate(inv.dueDate)}`

      new Notification(title, { body, tag: key })
      markNotified(key)
    }
  }, [invoices, cards, profile?.preferences?.notificationsEnabled, profile?.preferences?.reminderDaysBefore])
}
