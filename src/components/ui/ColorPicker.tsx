const PRESET_COLORS = [
  '#22C55E',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#3B82F6',
  '#6366F1',
  '#D946EF',
  '#14B8A6',
  '#0EA5E9',
  '#7F3DFF',
  '#64748B',
  '#0F766E',
  '#B45309',
  '#BE123C',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Cor</p>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => {
          const selected = color.toLowerCase() === value.toLowerCase()
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={[
                'w-8 h-8 rounded-full transition-transform',
                selected ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : '',
              ].join(' ')}
              style={{ backgroundColor: color }}
              aria-label={color}
              aria-pressed={selected}
            />
          )
        })}
      </div>
    </div>
  )
}
