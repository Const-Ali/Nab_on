import { formatServerTimestamp } from '../../shared'
import type { AppNotification } from '../../types'

const kindLabel: Record<AppNotification['kind'], string> = {
  assignment: 'ارجاع تازه',
  deadline: 'مهلت پیگیری',
  stalled: 'توقف در مرحله',
}

export function NotificationCenter({
  items,
  isOpen,
  error,
  onToggle,
  onOpen,
  onMarkRead,
  onMarkAllRead,
}: {
  items: AppNotification[]
  isOpen: boolean
  error: string
  onToggle: () => void
  onOpen: (item: AppNotification) => void
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}) {
  const unread = items.filter(item => !item.readAt).length

  return (
    <div className="relative" data-app-popover="notifications">
      <button
        type="button"
        className="relative inline-flex h-11 w-11 min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:h-10 sm:w-10 sm:min-h-10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40"
        onClick={onToggle}
        aria-label={`اعلان‌ها${unread ? `، ${unread.toLocaleString('fa-IR')} خوانده‌نشده` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="صندوق اعلان‌ها"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-slate-50 dark:ring-slate-950" aria-hidden="true">{unread > 99 ? '۹۹+' : unread.toLocaleString('fa-IR')}</span>}
      </button>

      {isOpen && (
        <section className="mobile-notification-popover absolute left-0 top-full z-[80] mt-2 flex max-h-[min(75dvh,34rem)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-label="صندوق اعلان‌ها" dir="rtl">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">اعلان‌های من</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">اعلان‌ها روی سرور نگهداری می‌شوند.</p>
            </div>
            {unread > 0 && <button type="button" className="min-h-10 rounded-lg px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40" onClick={onMarkAllRead}>خواندن همه</button>}
          </header>

          {error && <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200" role="status">تازه‌سازی اعلان‌ها ناموفق بود؛ اعلان‌های ذخیره‌شده نمایش داده می‌شوند.</p>}

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">اعلانی برای نمایش وجود ندارد.</p>
            ) : (
              <ul className="space-y-1">
                {items.map(item => (
                  <li key={item.id} className={`rounded-xl border ${item.readAt ? 'border-transparent bg-white dark:bg-slate-900' : 'border-indigo-100 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-950/20'}`}>
                    <div className="flex items-start gap-2 px-3 py-2.5">
                      <button type="button" className="min-w-0 flex-1 text-right" onClick={() => onOpen(item)}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-slate-300 dark:bg-slate-600' : 'bg-indigo-600'}`} aria-hidden="true" />
                          <b className="min-w-0 truncate text-xs text-slate-900 dark:text-white">{item.title}</b>
                          <small className="mr-auto shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{kindLabel[item.kind]}</small>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">{item.body}</span>
                        <time className="mt-1 block text-[10px] text-slate-400">{formatServerTimestamp(item.createdAt, item.ts)}</time>
                      </button>
                      {!item.readAt && <button type="button" className="min-h-10 shrink-0 rounded-lg px-2 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900/40" onClick={() => onMarkRead(item.id)} aria-label={`علامت‌گذاری به‌عنوان خوانده‌شده: ${item.title}`}>خواندم</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
