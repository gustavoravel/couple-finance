import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { processDueRecurrences } from '@/services/recurrenceService'

export function useRecurrenceProcessor() {
  const { user } = useAuth()
  const { household, recurrences, cards } = useHousehold()
  const processing = useRef(false)
  const lastKey = useRef('')

  useEffect(() => {
    if (!household || !user || recurrences.length === 0) return

    const dueCount = recurrences.filter((r) => r.active && r.nextRunDate <= new Date().toISOString().slice(0, 10)).length
    if (dueCount === 0) return

    const key = `${household.id}-${recurrences.map((r) => `${r.id}:${r.nextRunDate}`).join(',')}`
    if (processing.current || lastKey.current === key) return

    processing.current = true
    processDueRecurrences(household.id, recurrences, cards, user.uid)
      .finally(() => {
        processing.current = false
        lastKey.current = key
      })
  }, [household, user, recurrences, cards])
}
