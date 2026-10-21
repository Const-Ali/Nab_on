import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Button } from './Button'
import { cn, inputCls } from '../ui'

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function PasswordField({ className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="relative mt-1.5 block">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn(inputCls, 'mt-0 pr-12', className)}
      />
      <Button
        type="button"
        variant="unstyled"
        size="none"
        className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label={visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
        aria-pressed={visible}
        onClick={() => setVisible(value => !value)}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.8 4.1 10 7-.4 1-1.2 2.2-2.3 3.3M6.2 6.2C3.9 7.7 2.5 10 2 12c1.2 2.9 4.8 7 10 7 1.2 0 2.3-.2 3.4-.6"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
        )}
      </Button>
    </span>
  )
}
