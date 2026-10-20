/** Shared Tailwind utility recipes for the Nab interface. */

export const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')

export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950'
export const transition = 'transition-[background-color,border-color,color,box-shadow,transform] duration-150 motion-reduce:transition-none'
export const buttonInteraction = cn(
  'touch-manipulation select-none',
  'disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none active:scale-[0.98] disabled:active:scale-100',
  focusRing,
  transition,
)

export const panelBox = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
export const panelPad = 'p-4 sm:p-5'
export const panelH2 = 'text-base font-bold tracking-tight text-slate-950 dark:text-white'
export const panelH2Small = 'mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400'

export const backdropCls = 'fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm'
export const modalBox = 'relative my-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-slate-800 dark:bg-slate-900'
export const modalX = cn('absolute left-4 top-4 inline-flex h-9 items-center justify-center rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white', focusRing, transition)
export const modalSmall = 'block text-xs text-slate-500 dark:text-slate-400'
export const modalH2 = 'mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white'
export const modalP = 'mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400'
export const modalH = 'mt-6 text-sm font-bold text-slate-800 dark:text-slate-100'
export const modalHSmall = 'font-normal text-slate-500 dark:text-slate-400'
export const modalActions = 'mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end dark:border-slate-800'
export const modalNote = 'rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300'
export const modalFormLayout = cn(
  '[&_.x]:absolute [&_.x]:left-4 [&_.x]:top-4 [&_.x]:inline-flex [&_.x]:h-9 [&_.x]:px-2 [&_.x]:text-xs [&_.x]:items-center [&_.x]:justify-center [&_.x]:rounded-lg [&_.x]:text-slate-500 [&_.x]:transition-all [&_.x]:duration-200 hover:[&_.x]:bg-slate-100 hover:[&_.x]:text-slate-950 dark:hover:[&_.x]:bg-slate-800 dark:hover:[&_.x]:text-white',
  '[&>small]:block [&>small]:text-xs [&>small]:text-slate-500 dark:[&>small]:text-slate-400 [&>h2]:mt-1 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:tracking-tight [&>h2]:text-slate-950 dark:[&>h2]:text-white [&>p]:mt-2 [&>p]:text-sm [&>p]:leading-6 [&>p]:text-slate-500 dark:[&>p]:text-slate-400',
  '[&_.form-grid]:mt-5 [&_.form-grid]:grid [&_.form-grid]:grid-cols-1 [&_.form-grid]:gap-4 sm:[&_.form-grid]:grid-cols-2 [&_.form-grid>label]:block [&_.form-grid>label]:text-sm [&_.form-grid>label]:font-medium [&_.form-grid>label]:text-slate-700 dark:[&_.form-grid>label]:text-slate-200',
  '[&_.form-grid_input]:mt-1.5 [&_.form-grid_input]:block [&_.form-grid_input]:w-full [&_.form-grid_input]:rounded-xl [&_.form-grid_input]:border [&_.form-grid_input]:border-slate-200 [&_.form-grid_input]:bg-white [&_.form-grid_input]:px-3 [&_.form-grid_input]:py-2.5 [&_.form-grid_input]:text-sm [&_.form-grid_input]:text-slate-900 focus:[&_.form-grid_input]:border-indigo-500 focus:[&_.form-grid_input]:outline-none focus:[&_.form-grid_input]:ring-2 focus:[&_.form-grid_input]:ring-indigo-500/20 dark:[&_.form-grid_input]:border-slate-700 dark:[&_.form-grid_input]:bg-slate-950 dark:[&_.form-grid_input]:text-slate-100',
  '[&_.form-grid_select]:mt-1.5 [&_.form-grid_select]:block [&_.form-grid_select]:w-full [&_.form-grid_select]:rounded-xl [&_.form-grid_select]:border [&_.form-grid_select]:border-slate-200 [&_.form-grid_select]:bg-white [&_.form-grid_select]:px-3 [&_.form-grid_select]:py-2.5 [&_.form-grid_select]:text-sm dark:[&_.form-grid_select]:border-slate-700 dark:[&_.form-grid_select]:bg-slate-950 dark:[&_.form-grid_select]:text-slate-100',
  '[&_.form-grid_textarea]:mt-1.5 [&_.form-grid_textarea]:block [&_.form-grid_textarea]:min-h-24 [&_.form-grid_textarea]:w-full [&_.form-grid_textarea]:rounded-xl [&_.form-grid_textarea]:border [&_.form-grid_textarea]:border-slate-200 [&_.form-grid_textarea]:bg-white [&_.form-grid_textarea]:px-3 [&_.form-grid_textarea]:py-2.5 dark:[&_.form-grid_textarea]:border-slate-700 dark:[&_.form-grid_textarea]:bg-slate-950',
  '[&_.modal-h]:mt-6 [&_.modal-h]:text-sm [&_.modal-h]:font-bold [&_.modal-h]:text-slate-800 dark:[&_.modal-h]:text-slate-100 [&_.modal-h_small]:font-normal [&_.modal-h_small]:text-slate-500 [&_.tag-picker]:mt-3 [&_.tag-picker]:flex [&_.tag-picker]:flex-wrap [&_.tag-picker]:gap-2 [&_.tag-chip]:rounded-lg [&_.tag-chip]:border [&_.tag-chip]:border-slate-200 [&_.tag-chip]:bg-white [&_.tag-chip]:px-2.5 [&_.tag-chip]:py-1.5 [&_.tag-chip]:text-xs [&_.tag-chip]:font-medium [&_.tag-chip]:text-slate-600 [&_.tag-chip.on]:border-indigo-600 [&_.tag-chip.on]:bg-indigo-600 [&_.tag-chip.on]:text-white dark:[&_.tag-chip]:border-slate-700 dark:[&_.tag-chip]:bg-slate-900 dark:[&_.tag-chip]:text-slate-300',
  '[&_.perm-grid]:mt-3 [&_.perm-grid]:grid [&_.perm-grid]:grid-cols-1 [&_.perm-grid]:gap-2 sm:[&_.perm-grid]:grid-cols-2 [&_.perm-grid>label]:flex [&_.perm-grid>label]:items-center [&_.perm-grid>label]:gap-2 [&_.perm-grid>label]:rounded-xl [&_.perm-grid>label]:border [&_.perm-grid>label]:border-slate-200 [&_.perm-grid>label]:px-3 [&_.perm-grid>label]:py-2.5 [&_.perm-grid>label]:text-sm dark:[&_.perm-grid>label]:border-slate-700 [&_.act-row]:mt-4 [&_.act-row]:flex [&_.act-row]:items-center [&_.act-row]:justify-between [&_.act-row]:rounded-xl [&_.act-row]:bg-slate-50 [&_.act-row]:p-3 dark:[&_.act-row]:bg-slate-950/50',
  '[&_.error]:my-3 [&_.error]:rounded-xl [&_.error]:border [&_.error]:border-rose-200 [&_.error]:bg-rose-50 [&_.error]:px-3 [&_.error]:py-2 [&_.error]:text-sm [&_.error]:text-rose-700 dark:[&_.error]:border-rose-900/60 dark:[&_.error]:bg-rose-950/40 dark:[&_.error]:text-rose-300 [&_.modal-actions]:mt-6 [&_.modal-actions]:flex [&_.modal-actions]:flex-col-reverse [&_.modal-actions]:gap-2 [&_.modal-actions]:border-t [&_.modal-actions]:border-slate-100 [&_.modal-actions]:pt-4 sm:[&_.modal-actions]:flex-row sm:[&_.modal-actions]:justify-end dark:[&_.modal-actions]:border-slate-800',
)
export const modalSearchLayout = cn(
  '[&_.search-section]:border-b [&_.search-section]:border-slate-100 [&_.search-section]:p-3 last:[&_.search-section]:border-b-0 dark:[&_.search-section]:border-slate-800 [&_.search-section>h5]:mb-2 [&_.search-section>h5]:px-1 [&_.search-section>h5]:text-xs [&_.search-section>h5]:font-bold [&_.search-section>h5]:text-slate-500 dark:[&_.search-section>h5]:text-slate-400',
  '[&_.search-hit]:flex [&_.search-hit]:w-full [&_.search-hit]:items-center [&_.search-hit]:gap-3 [&_.search-hit]:rounded-xl [&_.search-hit]:px-3 [&_.search-hit]:py-2.5 [&_.search-hit]:text-right [&_.search-hit]:transition-all hover:[&_.search-hit]:bg-slate-100 dark:hover:[&_.search-hit]:bg-slate-800 [&_.search-hit_b]:block [&_.search-hit_b]:text-sm [&_.search-hit_b]:font-semibold [&_.search-hit_b]:text-slate-900 dark:[&_.search-hit_b]:text-slate-100 [&_.search-hit_small]:mt-0.5 [&_.search-hit_small]:block [&_.search-hit_small]:text-xs [&_.search-hit_small]:text-slate-500 dark:[&_.search-hit_small]:text-slate-400 [&_.cmd-badge]:mr-auto [&_.cmd-badge]:hidden [&_.cmd-badge]:rounded-full [&_.cmd-badge]:bg-slate-100 [&_.cmd-badge]:px-2 [&_.cmd-badge]:py-1 [&_.cmd-badge]:text-[10px] [&_.cmd-badge]:text-slate-500 sm:[&_.cmd-badge]:inline dark:[&_.cmd-badge]:bg-slate-800 dark:[&_.cmd-badge]:text-slate-300 [&_.empty]:m-3 [&_.empty]:rounded-xl [&_.empty]:border [&_.empty]:border-dashed [&_.empty]:border-slate-200 [&_.empty]:p-8 [&_.empty]:text-center [&_.empty]:text-sm [&_.empty]:text-slate-500 dark:[&_.empty]:border-slate-800',
)
export const personDetailLayout = cn(
  '[&_.summary]:mt-5 [&_.summary]:flex [&_.summary]:flex-col [&_.summary]:gap-3 [&_.summary]:rounded-2xl [&_.summary]:border [&_.summary]:border-slate-200 [&_.summary]:bg-slate-50 [&_.summary]:p-4 sm:[&_.summary]:flex-row sm:[&_.summary]:items-center dark:[&_.summary]:border-slate-800 dark:[&_.summary]:bg-slate-950/50 [&_.summary>span:nth-child(2)>b]:block [&_.summary>span:nth-child(2)>b]:text-sm [&_.summary>span:nth-child(2)>b]:font-bold [&_.summary>span:nth-child(2)>b]:text-slate-950 dark:[&_.summary>span:nth-child(2)>b]:text-white [&_.summary>span:nth-child(2)>small]:mt-1 [&_.summary>span:nth-child(2)>small]:block [&_.summary>span:nth-child(2)>small]:text-xs [&_.summary>span:nth-child(2)>small]:text-slate-500 [&_.sum-side]:flex [&_.sum-side]:flex-wrap [&_.sum-side]:items-center [&_.sum-side]:gap-2 sm:[&_.sum-side]:mr-auto',
  '[&_.stale-note]:mt-4 [&_.stale-note]:border-amber-200 [&_.stale-note]:bg-amber-50 [&_.stale-note]:text-amber-800 dark:[&_.stale-note]:border-amber-900/60 dark:[&_.stale-note]:bg-amber-950/30 dark:[&_.stale-note]:text-amber-200 [&_.details]:mt-4 [&_.details]:grid [&_.details]:grid-cols-1 [&_.details]:gap-2 sm:[&_.details]:grid-cols-2 lg:[&_.details]:grid-cols-3 [&_.details>span]:rounded-xl [&_.details>span]:border [&_.details>span]:border-slate-200 [&_.details>span]:bg-white [&_.details>span]:p-3 [&_.details>span]:text-xs [&_.details>span]:text-slate-500 dark:[&_.details>span]:border-slate-800 dark:[&_.details>span]:bg-slate-950 dark:[&_.details>span]:text-slate-400 [&_.details_b]:mt-1 [&_.details_b]:block [&_.details_b]:text-sm [&_.details_b]:font-semibold [&_.details_b]:text-slate-900 dark:[&_.details_b]:text-slate-100',
  '[&_.steps-list]:mt-3 [&_.steps-list]:flex [&_.steps-list]:gap-2 [&_.steps-list]:overflow-x-auto [&_.steps-list]:pb-2 [&_.step-item]:relative [&_.step-item]:flex [&_.step-item]:min-w-28 [&_.step-item]:flex-1 [&_.step-item]:flex-col [&_.step-item]:items-center [&_.step-item]:gap-2 [&_.step-item]:rounded-xl [&_.step-item]:border [&_.step-item]:border-slate-200 [&_.step-item]:bg-white [&_.step-item]:p-3 [&_.step-item]:text-center [&_.step-item]:text-xs [&_.step-item]:font-medium [&_.step-item]:text-slate-500 dark:[&_.step-item]:border-slate-800 dark:[&_.step-item]:bg-slate-950 [&_.step-item>i]:grid [&_.step-item>i]:h-7 [&_.step-item>i]:w-7 [&_.step-item>i]:place-items-center [&_.step-item>i]:rounded-full [&_.step-item>i]:bg-slate-100 [&_.step-item>i]:text-xs [&_.step-item.done>i]:bg-emerald-100 [&_.step-item.done>i]:text-emerald-700 [&_.step-item.current]:border-indigo-300 [&_.step-item.current]:bg-indigo-50 [&_.step-item.current]:text-indigo-700 dark:[&_.step-item.current]:border-indigo-800 dark:[&_.step-item.current]:bg-indigo-950/40 dark:[&_.step-item.current]:text-indigo-200 [&_.step-item.current>i]:bg-indigo-600 [&_.step-item.current>i]:text-white [&_.step-item_em]:text-[10px] [&_.step-item_em]:not-italic [&_.step-item_em]:text-indigo-600',
  '[&>label:not(.assign-label)]:mt-4 [&>label:not(.assign-label)]:block [&>label:not(.assign-label)]:text-sm [&>label:not(.assign-label)]:font-medium [&>label:not(.assign-label)]:text-slate-700 dark:[&>label:not(.assign-label)]:text-slate-200 [&>label>select]:mt-1.5 [&>label>select]:block [&>label>select]:w-full [&>label>select]:rounded-xl [&>label>select]:border [&>label>select]:border-slate-200 [&>label>select]:bg-white [&>label>select]:px-3 [&>label>select]:py-2.5 [&>label>select]:text-sm dark:[&>label>select]:border-slate-700 dark:[&>label>select]:bg-slate-950 dark:[&>label>select]:text-slate-100 [&>label>textarea]:mt-1.5 [&>label>textarea]:block [&>label>textarea]:min-h-24 [&>label>textarea]:w-full [&>label>textarea]:rounded-xl [&>label>textarea]:border [&>label>textarea]:border-slate-200 [&>label>textarea]:bg-white [&>label>textarea]:p-3 dark:[&>label>textarea]:border-slate-700 dark:[&>label>textarea]:bg-slate-950 [&_.assign-label]:mt-4 [&_.assign-label]:block [&_.assign-label]:text-sm [&_.assign-label]:font-medium [&_.assign-label]:text-slate-700 dark:[&_.assign-label]:text-slate-200',
  '[&_.modal-tabs]:mt-6 [&_.modal-tabs]:flex [&_.modal-tabs]:gap-2 [&_.modal-tabs]:border-b [&_.modal-tabs]:border-slate-200 dark:[&_.modal-tabs]:border-slate-800 [&_.modal-tabs_button]:rounded-t-xl [&_.modal-tabs_button]:px-3 [&_.modal-tabs_button]:py-2.5 [&_.modal-tabs_button]:text-sm [&_.modal-tabs_button]:font-semibold [&_.modal-tabs_button]:text-slate-500 [&_.modal-tabs_button.active]:bg-indigo-50 [&_.modal-tabs_button.active]:text-indigo-700 dark:[&_.modal-tabs_button.active]:bg-indigo-950/40 dark:[&_.modal-tabs_button.active]:text-indigo-200 [&_.chat]:mt-4 [&_.chat]:max-h-80 [&_.chat]:space-y-3 [&_.chat]:overflow-y-auto [&_.chat]:rounded-2xl [&_.chat]:bg-slate-50 [&_.chat]:p-3 dark:[&_.chat]:bg-slate-950/50 [&_.msg]:rounded-xl [&_.msg]:border [&_.msg]:border-slate-200 [&_.msg]:bg-white [&_.msg]:p-3 dark:[&_.msg]:border-slate-800 dark:[&_.msg]:bg-slate-900 [&_.msg.mine]:border-indigo-200 [&_.msg.mine]:bg-indigo-50/60 dark:[&_.msg.mine]:border-indigo-900/60 dark:[&_.msg.mine]:bg-indigo-950/30 [&_.msg_header]:flex [&_.msg_header]:items-start [&_.msg_header]:gap-2 [&_.msg_header]:text-sm [&_.msg_header_small]:mr-auto [&_.msg_header_small]:text-[11px] [&_.msg_header_small]:text-slate-500 [&_.msg>p]:mt-2 [&_.msg>p]:text-sm [&_.msg>p]:leading-6 [&_.msg>p]:text-slate-700 dark:[&_.msg>p]:text-slate-200',
  '[&_.composer]:mt-3 [&_.composer]:flex [&_.composer]:flex-col [&_.composer]:gap-2 sm:[&_.composer]:flex-row [&_.composer_textarea]:min-h-20 [&_.composer_textarea]:flex-1 [&_.composer_textarea]:rounded-xl [&_.composer_textarea]:border [&_.composer_textarea]:border-slate-200 [&_.composer_textarea]:bg-white [&_.composer_textarea]:p-3 [&_.composer_textarea]:text-sm dark:[&_.composer_textarea]:border-slate-700 dark:[&_.composer_textarea]:bg-slate-950 [&_.timeline]:mt-4 [&_.timeline]:space-y-3 [&_.tl-item]:flex [&_.tl-item]:gap-3 [&_.tl-item_b]:block [&_.tl-item_b]:text-sm [&_.tl-item_b]:text-slate-800 dark:[&_.tl-item_b]:text-slate-100 [&_.tl-item_small]:mt-1 [&_.tl-item_small]:block [&_.tl-item_small]:text-xs [&_.tl-item_small]:text-slate-500',
)

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
