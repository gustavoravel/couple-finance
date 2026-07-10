import type { CSSProperties } from 'react'
import { getIcon } from '@/lib/icons'

interface IconProps {
  name: string
  size?: number
  className?: string
  style?: CSSProperties
}

export function Icon({ name, size = 20, className = '', style }: IconProps) {
  const Lucide = getIcon(name)
  return <Lucide className={className} size={size} style={style} aria-hidden />
}
