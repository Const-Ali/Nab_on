import { Button } from './Button'
import { cn } from '../ui'
import type { ThemeMode } from '../../types'

export function ThemeToggle({ theme, onToggle, className }: {
  theme: ThemeMode
  onToggle: () => void
  className?: string
}) {
  const targetMode = theme === 'dark' ? 'light' : 'dark'
  const targetLabel = targetMode === 'dark' ? 'تاریک' : 'روشن'

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('shrink-0', className)}
      onClick={onToggle}
      title={`تغییر به حالت ${targetLabel}`}
      aria-label={`تغییر به حالت ${targetLabel}`}
      aria-pressed={theme === 'dark'}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn('h-5 w-5 transition-transform duration-200', theme === 'dark' ? 'text-amber-400' : 'text-indigo-600')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {theme === 'dark' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </>
        ) : (
          <path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.8 8.8 0 1 0 20.9 13Z" />
        )}
      </svg>
      <span className="sr-only">حالت {targetLabel}</span>
    </Button>
  )
}
