import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  FileBarChart,
  RefreshCw,
  Settings,
  Tags,
  Target,
  Wallet,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'

const menuItems = [
  { to: '/painel', icon: CalendarDays, label: 'Painel mensal', description: 'Entradas, saídas e quanto sobra' },
  { to: '/contas', icon: Wallet, label: 'Contas', description: 'Saldos e contas do casal' },
  { to: '/categorias', icon: Tags, label: 'Categorias', description: 'Ícones, cores e subcategorias' },
  { to: '/metas', icon: Target, label: 'Metas & Reserva', description: 'Objetivos e reserva de emergência' },
  { to: '/relatorios', icon: FileBarChart, label: 'Relatórios', description: 'Exportar CSV/PDF e importar' },
  { to: '/recorrencias', icon: RefreshCw, label: 'Recorrências', description: 'Salários e contas fixas' },
  { to: '/ajustes', icon: Settings, label: 'Ajustes', description: 'Perfil, convite e notificações' },
]

export function MorePage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Mais</h1>
        <p className="text-sm text-gray-500">Painel, contas, relatórios e configurações</p>
      </header>

      <div className="flex flex-col gap-2">
        {menuItems.map(({ to, icon: Icon, label, description }) => (
          <Link key={to} to={to}>
            <Card padding="sm" className="flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
