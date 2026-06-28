import { useEffect, useRef } from 'react'
import { useHousehold } from '@/contexts/HouseholdContext'
import { closeDueInvoices } from '@/services/invoiceService'

export function useInvoiceProcessor() {
  const { household, invoices } = useHousehold()
  const processing = useRef(false)
  const lastKey = useRef('')

  useEffect(() => {
    if (!household || invoices.length === 0) return

    const dueCount = invoices.filter(
      (inv) => inv.status === 'open' && inv.closingDate <= new Date().toISOString().slice(0, 10),
    ).length
    if (dueCount === 0) return

    const key = invoices
      .filter((inv) => inv.status === 'open')
      .map((inv) => `${inv.id}:${inv.closingDate}`)
      .join(',')
    if (processing.current || lastKey.current === key) return

    processing.current = true
    closeDueInvoices(household.id, invoices)
      .finally(() => {
        processing.current = false
        lastKey.current = key
      })
  }, [household, invoices])
}
