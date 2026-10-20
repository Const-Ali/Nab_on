import { useState } from 'react'
import { Button } from './Button'

export interface LegacySnapshot {
  state: Record<string, unknown[]>
  hasLegacyUsers: boolean
}

export function LegacyDataMigration({ snapshot, canImport, onImport, onDiscard, onDownload }: {
  snapshot: LegacySnapshot
  canImport: boolean
  onImport: () => Promise<void>
  onDiscard: () => void
  onDownload: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const people = snapshot.state['nab:people']?.length ?? 0
  const notes = snapshot.state['nab:notes']?.length ?? 0
  const activities = snapshot.state['nab:activities']?.length ?? 0
  const tasks = snapshot.state.tasks?.length ?? 0
  const hasRecords = people + notes + activities + tasks > 0

  const importData = async () => {
    setBusy(true)
    setError('')
    try { await onImport() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'انتقال داده‌ها ناموفق بود.') }
    finally { setBusy(false) }
  }

  return (
    <section className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-slate-800 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100 sm:p-5" dir="rtl">
      <h2 className="text-sm font-bold">داده‌های قدیمی این مرورگر پیدا شد</h2>
      <p className="mt-2 text-sm leading-6">{people.toLocaleString('fa-IR')} پرونده، {notes.toLocaleString('fa-IR')} یادداشت، {activities.toLocaleString('fa-IR')} رویداد و {tasks.toLocaleString('fa-IR')} کار در مرورگر باقی مانده است. می‌توانید آن‌ها را به دیتابیس هاست منتقل کنید یا پس از گرفتن پشتیبان پاک کنید.</p>
      {snapshot.hasLegacyUsers && <p className="mt-2 text-xs leading-6">حساب‌ها و رمزهای قدیمی منتقل نمی‌شوند؛ رمزهای آن‌ها در مرورگر به‌صورت متن ساده ذخیره شده بودند. کاربران را در سامانهٔ هاست دوباره بسازید و برایشان رمز قوی تعیین کنید.</p>}
      {!canImport && hasRecords && <p className="mt-2 text-xs leading-6">انتقال خودکار فقط به دیتابیس خالی مجاز است تا اطلاعات موجود روی هاست بازنویسی یا ادغام ناخواسته نشود. ابتدا از داده‌های قدیمی پشتیبان بگیرید.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-rose-700 dark:bg-slate-950/60 dark:text-rose-300">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {hasRecords && <Button type="button" variant="primary" size="sm" disabled={!canImport || busy} loading={busy} loadingText="در حال انتقال..." onClick={importData}>انتقال داده‌ها به هاست</Button>}
        <Button type="button" variant="outline" size="sm" onClick={onDownload}>دانلود پشتیبان</Button>
        <Button type="button" variant="dangerGhost" size="sm" onClick={onDiscard}>پاک‌کردن داده‌های قدیمی</Button>
      </div>
    </section>
  )
}
