import type { AppVersionStatus } from '../../version'

export function VersionInfoCard({ status, compact = false, onRefresh }: {
  status: AppVersionStatus
  compact?: boolean
  onRefresh?: () => void | Promise<void>
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-3' : 'p-4 sm:p-5'} shadow-sm dark:border-slate-800 dark:bg-slate-900`} aria-label="نسخهٔ برنامه">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`${compact ? 'text-xs' : 'text-base'} font-bold text-slate-900 dark:text-white`}>نسخهٔ برنامه</h2>
        {onRefresh && (
          <button
            type="button"
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => { void onRefresh() }}
            disabled={status.checking}
          >
            {status.checking ? 'در حال بررسی…' : 'بررسی دوباره'}
          </button>
        )}
      </div>

      <dl className={`mt-3 grid ${compact ? 'grid-cols-1 gap-1.5' : 'grid-cols-1 gap-3 sm:grid-cols-2'} text-sm`}>
        <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
          <dt className="text-xs text-slate-500 dark:text-slate-400">نسخهٔ نصب‌شده</dt>
          <dd className="mt-1 font-bold text-slate-900 dark:text-white" dir="ltr">{status.currentVersion}</dd>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/60">
          <dt className="text-xs text-slate-500 dark:text-slate-400">آخرین Release گیت‌هاب</dt>
          <dd className="mt-1 font-bold text-slate-900 dark:text-white" dir="ltr">
            {status.latestVersion ?? (status.checking ? 'در حال بررسی…' : 'در دسترس نیست')}
          </dd>
        </div>
      </dl>

      {status.mismatch && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200" role="alert" aria-live="assertive">
          نسخه‌ها متفاوت‌اند؛ بررسی و ممیزی این تغییر بر عهدهٔ مدیر سیستم، علی محمدی، است.
        </p>
      )}
      {!status.mismatch && status.latestVersion && (
        <p className="mt-3 text-xs leading-5 text-emerald-700 dark:text-emerald-300" role="status">نسخهٔ نصب‌شده با آخرین Release مطابقت دارد.</p>
      )}
      {!status.latestVersion && status.error && (
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400" role="status">بررسی خودکار ناموفق بود؛ اتصال اینترنت یا دسترسی به GitHub را بررسی کنید.</p>
      )}
      {status.error && status.latestVersion && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400" role="status">تازه‌سازی اطلاعات گیت‌هاب ناموفق بود؛ نتیجهٔ ذخیره‌شده نمایش داده می‌شود.</p>
      )}

      <a className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-indigo-700 underline underline-offset-2 dark:text-indigo-300" href={status.releaseUrl} target="_blank" rel="noreferrer">
        دیدن Releaseها در GitHub
      </a>
    </section>
  )
}
