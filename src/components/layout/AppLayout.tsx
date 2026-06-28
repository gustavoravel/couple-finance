import { Outlet } from 'react-router-dom'
import { BottomNav, SideNav } from '@/components/layout/BottomNav'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { useRecurrenceProcessor } from '@/hooks/useRecurrenceProcessor'
import { useDueReminders } from '@/hooks/useDueReminders'
import { useInvoiceProcessor } from '@/hooks/useInvoiceProcessor'

export function AppLayout() {
  useRecurrenceProcessor()
  useDueReminders()
  useInvoiceProcessor()

  return (
    <div className="min-h-screen bg-surface flex">
      <SideNav />
      <div className="flex-1 flex flex-col min-h-screen">
        <OfflineBanner />
        <main className="flex-1 pb-24 lg:pb-6 max-w-lg lg:max-w-4xl mx-auto w-full px-4 pt-4">
          <Outlet />
        </main>
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
