/** Shared Tailwind utility recipes for the Nab interface. */

export const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')

export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950'
export const transition = 'transition-all duration-200'

export const btnPrimary = cn(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm',
  'hover:bg-indigo-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  focusRing,
  transition,
)
export const btnOutline = cn(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm',
  'hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  focusRing,
  transition,
)
export const btnDanger = cn(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700',
  'hover:bg-rose-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
  focusRing,
  transition,
)
export const btnMini = cn(
  'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm',
  'hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  focusRing,
  transition,
)
export const btnMiniOn = 'border-indigo-600 bg-indigo-600 text-white hover:border-indigo-500 hover:bg-indigo-500 dark:border-indigo-500 dark:bg-indigo-500'
export const dangerLiteTxt = 'border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300'

export const panelBox = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
export const panelPad = 'p-4 sm:p-5'
export const panelH2 = 'text-base font-bold tracking-tight text-slate-950 dark:text-white'
export const panelH2Small = 'mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400'

export const backdropCls = 'fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm'
export const modalBox = 'relative my-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-slate-800 dark:bg-slate-900'
export const modalX = cn('absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white', focusRing, transition)
export const modalSmall = 'block text-xs text-slate-500 dark:text-slate-400'
export const modalH2 = 'mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white'
export const modalP = 'mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400'
export const modalH = 'mt-6 text-sm font-bold text-slate-800 dark:text-slate-100'
export const modalHSmall = 'font-normal text-slate-500 dark:text-slate-400'
export const modalActions = 'mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end dark:border-slate-800'
export const modalNote = 'rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300'

export const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-200'
export const inputCls = cn('mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400', 'hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500', 'dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:disabled:bg-slate-900', transition)
export const textareaCls = `${inputCls} min-h-24 resize-y`
export const selectCls = inputCls
export const formGrid = 'grid grid-cols-1 gap-4 sm:grid-cols-2'
export const errorBox = 'my-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
export const emptyBox = 'rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400'
export const rowCheck = 'h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500'
export const permGrid = 'grid grid-cols-1 gap-2 sm:grid-cols-2'

export const searchBox = 'flex min-h-10 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm transition-all duration-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900'
export const searchInput = 'min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white'
export const searchIcon = 'h-4 w-4 shrink-0 text-slate-400'

export const chipBase = 'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium not-italic'
export const chipCat = 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
export const chipTag = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
export const dlChipBase = 'inline-flex w-fit whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium not-italic'
export const staleChip = 'inline-flex whitespace-nowrap rounded-md bg-rose-50 px-2 py-1 text-xs font-medium not-italic text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
export const offChip = 'mr-2 inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium not-italic text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
export const roleChip = 'inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium not-italic text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
export const mentionTxt = 'rounded bg-indigo-50 px-1 font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
export const mentionTag = 'mr-2 inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium not-italic text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
export const kbdCls = 'rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'

export const avatarBase = 'grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl text-sm font-bold'
export const avatarSize: Record<number, string> = { 28: 'h-7 w-7 rounded-lg text-xs', 34: 'h-9 w-9 rounded-xl text-sm', 44: 'h-11 w-11 rounded-xl text-base', 64: 'h-16 w-16 rounded-2xl text-xl' }
export const avatarTones: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  blue: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  purple: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  orange: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export const badgeBase = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1 text-xs font-medium'
export const badgeDot = 'h-1.5 w-1.5 rounded-full bg-current'
export const badgeTones: Record<string, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300',
  purple: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  orange: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300',
  red: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
  pink: 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900/60 dark:bg-pink-950/40 dark:text-pink-300',
  slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export const shimmerBox = 'animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800'
