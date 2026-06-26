import { Filter } from 'lucide-react'
import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import type { Account, Category } from '@/types'
import type { FilterState, PeriodMode, TypeFilter } from '@/lib/transactionFilters'

interface MemberOption {
  uid: string
  name: string
}

interface FilterBarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  categories: Category[]
  accounts: Account[]
  members: MemberOption[]
  showTypeFilter?: boolean
}

export function FilterBar({
  filters,
  onChange,
  categories,
  accounts,
  members,
  showTypeFilter = true,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({ ...filters, [key]: value })
  }

  const expenseCategories = categories.filter((c) => c.kind === 'expense' || c.kind === 'income')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <Select
          label=""
          aria-label="Período"
          className="flex-1 min-w-[120px]"
          options={[
            { value: 'month', label: 'Mês' },
            { value: 'year', label: 'Ano' },
            { value: 'range', label: 'Intervalo' },
          ]}
          value={filters.periodMode}
          onChange={(e) => set('periodMode', e.target.value as PeriodMode)}
        />

        {filters.periodMode === 'month' && (
          <Input
            type="month"
            value={filters.month}
            onChange={(e) => set('month', e.target.value)}
            className="flex-1 min-w-[140px]"
          />
        )}

        {filters.periodMode === 'year' && (
          <Input
            type="number"
            min={2000}
            max={2100}
            value={filters.year}
            onChange={(e) => set('year', Number(e.target.value))}
            className="flex-1 min-w-[100px]"
          />
        )}

        {filters.periodMode === 'range' && (
          <>
            <Input type="date" value={filters.startDate} onChange={(e) => set('startDate', e.target.value)} />
            <Input type="date" value={filters.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </>
        )}

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={[
            'flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium border transition-colors self-end',
            expanded ? 'bg-primary-50 border-primary text-primary' : 'bg-white border-gray-200 text-gray-600',
          ].join(' ')}
        >
          <Filter className="w-4 h-4" />
          Mais
        </button>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-gray-100">
          {showTypeFilter && (
            <Select
              label="Tipo"
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'income', label: 'Entradas' },
                { value: 'expense', label: 'Saídas' },
                { value: 'transfer', label: 'Transferências' },
              ]}
              value={filters.type}
              onChange={(e) => set('type', e.target.value as TypeFilter)}
            />
          )}
          <Select
            label="Categoria"
            options={[
              { value: '', label: 'Todas' },
              ...expenseCategories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={filters.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
          />
          <Select
            label="Conta"
            options={[
              { value: '', label: 'Todas' },
              ...accounts.map((a) => ({ value: a.id, label: a.name })),
            ]}
            value={filters.accountId}
            onChange={(e) => set('accountId', e.target.value)}
          />
          {members.length > 1 && (
            <Select
              label="Pessoa"
              options={[
                { value: '', label: 'Casal (todos)' },
                ...members.map((m) => ({ value: m.uid, label: m.name })),
              ]}
              value={filters.createdBy}
              onChange={(e) => set('createdBy', e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  )
}
