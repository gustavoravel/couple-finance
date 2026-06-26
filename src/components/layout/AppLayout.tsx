import { Outlet } from 'react-router-dom'
import { BottomNav, SideNav } from '@/components/layout/BottomNav'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-surface flex">
      <SideNav />
      <div className="flex-1 flex flex-col min-h-screen">
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
