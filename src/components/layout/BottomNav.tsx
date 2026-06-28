import { NavLink } from 'react-router-dom'
import { Home, List, Plus, CreditCard, Menu, CalendarDays, Settings, Wallet, FileBarChart, Target } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/lancamentos', icon: List, label: 'Lançamentos' },
  { to: '/novo', icon: Plus, label: 'Novo', isFab: true },
  { to: '/cartoes', icon: CreditCard, label: 'Cartões' },
  { to: '/mais', icon: Menu, label: 'Mais' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-bottom">
      <div className="max-w-lg mx-auto flex items-end justify-around px-2 pt-2 pb-1">
        {navItems.map(({ to, icon: Icon, label, isFab }) =>
          isFab ? (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center -mt-5"
            >
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-medium text-primary mt-1">{label}</span>
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[56px]',
                  isActive ? 'text-primary' : 'text-gray-400',
                ].join(' ')
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ),
        )}
      </div>
    </nav>
  )
}

export function SideNav() {
  const items = [
    ...navItems.filter((i) => !i.isFab),
    { to: '/painel', icon: CalendarDays, label: 'Painel' },
    { to: '/metas', icon: Target, label: 'Metas' },
    { to: '/relatorios', icon: FileBarChart, label: 'Relatórios' },
    { to: '/contas', icon: Wallet, label: 'Contas' },
    { to: '/ajustes', icon: Settings, label: 'Ajustes' },
  ]

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 p-4 gap-1">
      <div className="px-3 py-4 mb-4">
        <h1 className="text-xl font-bold text-primary">Finanças do Casal</h1>
        <p className="text-xs text-gray-400 mt-1">Controle compartilhado</p>
      </div>
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
              isActive ? 'bg-primary-50 text-primary' : 'text-gray-600 hover:bg-gray-50',
            ].join(' ')
          }
        >
          <Icon className="w-5 h-5" />
          {label}
        </NavLink>
      ))}
      <NavLink
        to="/novo"
        className="mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
      >
        <Plus className="w-5 h-5" />
        Novo lançamento
      </NavLink>
    </aside>
  )
}
