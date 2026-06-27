import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div className="bg-amber-500 text-white text-sm font-medium px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Você está offline — os lançamentos serão sincronizados ao reconectar</span>
    </div>
  )
}
