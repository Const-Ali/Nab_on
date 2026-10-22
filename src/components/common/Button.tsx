import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonInteraction, cn } from '../ui'

export type ButtonVariant = 'unstyled' | 'primary' | 'outline' | 'danger' | 'ghost' | 'dangerGhost' | 'soft' | 'tab' | 'card'
export type ButtonSize = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  active?: boolean
  loading?: boolean
  loadingText?: string
}

const variants: Record<Exclude<ButtonVariant, 'unstyled'>, string> = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600 font-medium text-white shadow-sm hover:border-indigo-500 hover:bg-indigo-500 disabled:border-indigo-200 disabled:bg-indigo-100 disabled:text-indigo-500 disabled:opacity-100 dark:border-indigo-500 dark:bg-indigo-500 dark:hover:border-indigo-400 dark:hover:bg-indigo-400 dark:disabled:border-indigo-900/60 dark:disabled:bg-indigo-950/40 dark:disabled:text-indigo-300',
  outline:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-200',
  danger:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 font-medium text-rose-700 shadow-sm hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70',
  ghost:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-transparent bg-transparent font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  dangerGhost:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-transparent bg-transparent font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/50',
  soft:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 font-medium text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-950/70',
  tab:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-transparent font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  card:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-900/60 dark:hover:bg-slate-800/70',
}

const sizes: Record<ButtonSize, string> = {
  none: '',
  xs: 'min-h-10 px-2.5 py-1.5 text-xs sm:min-h-8 sm:py-1',
  sm: 'min-h-11 px-3 py-2 text-xs sm:min-h-9',
  md: 'min-h-11 px-4 py-2.5 text-sm sm:min-h-10',
  lg: 'min-h-11 px-5 py-3 text-sm',
  icon: 'h-11 w-11 min-h-11 p-0 text-sm sm:h-10 sm:w-10 sm:min-h-10',
}

const activeStyles: Partial<Record<ButtonVariant, string>> = {
  outline:
    'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200',
  soft:
    'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500 dark:border-indigo-500 dark:bg-indigo-500 dark:text-white',
  tab: 'bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-950/50 dark:text-indigo-200',
  card: 'border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200 dark:border-indigo-800 dark:bg-indigo-950/40 dark:ring-indigo-900/50',
}

export function Button({
  variant = 'unstyled',
  size,
  active,
  loading = false,
  loadingText,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  const buttonSize = size ?? (variant === 'unstyled' ? 'none' : 'md')
  const variantClass = variant === 'unstyled' ? '' : variants[variant]
  const activeClass = active ? activeStyles[variant] ?? '' : ''
  const ariaPressed = props['aria-pressed'] ?? active
  const content: ReactNode = loading && loadingText ? loadingText : children

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || props['aria-busy']}
      aria-pressed={ariaPressed}
      className={cn(buttonInteraction, variantClass, buttonSize === 'none' ? '' : sizes[buttonSize], activeClass, className)}
    >
      {loading && (
        <svg className="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-90" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {content}
    </button>
  )
}
