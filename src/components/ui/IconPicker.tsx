import { ICON_OPTIONS } from '@/lib/icons'
import { Icon } from '@/components/ui/Icon'

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  color?: string
}

export function IconPicker({ value, onChange, color = '#7F3DFF' }: IconPickerProps) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Ícone</p>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
        {ICON_OPTIONS.map((name) => {
          const selected = name === value
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={[
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                selected ? 'ring-2 ring-offset-1 scale-105' : 'bg-gray-50 hover:bg-gray-100',
              ].join(' ')}
              style={
                selected
                  ? { backgroundColor: `${color}22`, color, ['--tw-ring-color' as string]: color }
                  : { color: '#6B7280' }
              }
              aria-label={name}
              aria-pressed={selected}
            >
              <Icon name={name} size={20} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
