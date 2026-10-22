import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../common/Button'
import { PasswordField } from '../common/PasswordField'
import { downloadFullBackup, downloadSafetyBackup, purgeServerData, restoreFullBackup } from '../../api-client'
import { cn, inputCls, labelCls, modalBox, modalFormLayout, panelBox, panelH2, backdropCls } from '../ui'

type ToolMode = 'export' | 'restore' | 'purge'
type Completion = 'restore' | 'purge' | null

export function ServerDataTools({ canExport, canRestore, canPurge }: {
  canExport: boolean
  canRestore: boolean
  canPurge: boolean
}) {
  const [mode, setMode] = useState<ToolMode | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [backupPassword, setBackupPassword] = useState('')
  const [backupPasswordAgain, setBackupPasswordAgain] = useState('')
  const [archivePassword, setArchivePassword] = useState('')
  const [safetyPassword, setSafetyPassword] = useState('')
  const [safetyPasswordAgain, setSafetyPasswordAgain] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [safetyBackupId, setSafetyBackupId] = useState('')
  const [completion, setCompletion] = useState<Completion>(null)

  const close = (force = false) => {
    if (busy && !force) return
    setMode(null)
    setCurrentPassword('')
    setBackupPassword('')
    setBackupPasswordAgain('')
    setArchivePassword('')
    setSafetyPassword('')
    setSafetyPasswordAgain('')
    setConfirmation('')
    setBackupFile(null)
    setError('')
  }

  const begin = (next: ToolMode) => {
    setNotice('')
    setError('')
    setCompletion(null)
    setSafetyBackupId('')
    setMode(next)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!mode) return
    setError('')
    setNotice('')
    if (!currentPassword) { setError('رمز ورود فعلی خود را وارد کنید.'); return }
    setBusy(true)
    try {
      if (mode === 'export') {
        if (backupPassword.length < 12) throw new Error('رمز فایل بکاپ باید دست‌کم ۱۲ نویسه باشد.')
        if (backupPassword !== backupPasswordAgain) throw new Error('تکرار رمز فایل بکاپ یکسان نیست.')
        await downloadFullBackup(currentPassword, backupPassword)
        setNotice('بکاپ کامل رمزگذاری‌شده دانلود شد. رمز فایل را جدا از خود فایل و در جای امن نگه دارید؛ فراموشی رمز امکان بازیابی را از بین می‌برد.')
        close(true)
        return
      }

      if (safetyPassword.length < 12) throw new Error('رمز بکاپ ایمنی باید دست‌کم ۱۲ نویسه باشد.')
      if (safetyPassword !== safetyPasswordAgain) throw new Error('تکرار رمز بکاپ ایمنی یکسان نیست.')

      if (mode === 'restore') {
        if (!backupFile) throw new Error('فایل بکاپ رمزگذاری‌شده را انتخاب کنید.')
        if (backupFile.size > 250 * 1024 * 1024) throw new Error('حداکثر اندازهٔ فایل بکاپ ۲۵۰ مگابایت است.')
        const archiveHeader = new TextDecoder().decode(await backupFile.slice(0, 6).arrayBuffer())
        if (!['NABDB1', 'NABDB2'].includes(archiveHeader)) throw new Error('سرآیند فایل بکاپ معتبر نیست.')
        if (archiveHeader === 'NABDB2' && archivePassword.length < 12) throw new Error('رمز فایل بکاپ باید دست‌کم ۱۲ نویسه باشد.')
        if (confirmation !== 'بازیابی کامل سامانه') throw new Error('برای تأیید، عبارت «بازیابی کامل سامانه» را دقیق وارد کنید.')
        const result = await restoreFullBackup(backupFile, currentPassword, archivePassword, safetyPassword, confirmation)
        setSafetyBackupId(result.safety_backup_id)
        setCompletion('restore')
        setNotice(`${result.message} برای ادامه، بکاپ ایمنی را دانلود کنید و سپس به صفحهٔ ورود برگردید.`)
        close(true)
        try { await downloadSafetyBackup(result.safety_backup_id) } catch (cause) {
          setError(cause instanceof Error ? `بازیابی انجام شد، اما دانلود خودکار بکاپ ایمنی ناموفق بود: ${cause.message}` : 'بازیابی انجام شد؛ بکاپ ایمنی را با دکمهٔ پایین دریافت کنید.')
        }
      } else {
        if (confirmation !== 'پاکسازی داده‌ها') throw new Error('برای تأیید، عبارت «پاکسازی داده‌ها» را دقیق وارد کنید.')
        const result = await purgeServerData(currentPassword, safetyPassword, confirmation)
        setSafetyBackupId(result.safety_backup_id)
        setCompletion('purge')
        setNotice(`${result.message} بکاپ ایمنی رمزگذاری‌شده پیش از پاکسازی ساخته شده است.`)
        close(true)
        try { await downloadSafetyBackup(result.safety_backup_id) } catch (cause) {
          setError(cause instanceof Error ? `پاکسازی انجام شد، اما دانلود خودکار بکاپ ایمنی ناموفق بود: ${cause.message}` : 'پاکسازی انجام شد؛ بکاپ ایمنی را با دکمهٔ پایین دریافت کنید.')
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'اجرای عملیات ناموفق بود.')
    } finally {
      setBusy(false)
    }
  }

  const formTitle = mode === 'export' ? 'استخراج بکاپ کامل' : mode === 'restore' ? 'بازیابی بکاپ کامل' : 'پاکسازی داده‌های عملیاتی'
  const formDescription = mode === 'export'
    ? 'فایل شامل حساب‌ها، هش رمزها، نقش‌ها، تنظیمات و همهٔ داده‌های ذخیره‌شده است؛ رمز خام و فایل تنظیمات هاست داخل آن نیست.'
    : mode === 'restore'
      ? 'بازیابی، همهٔ کاربران و تمام داده‌های فعلی را با محتوای فایل جایگزین می‌کند. پیش از جایگزینی، یک بکاپ ایمنی از وضعیت فعلی ساخته می‌شود.'
      : 'پرونده‌ها، یادداشت‌ها، فعالیت‌ها، لاگ‌ها، اعلان‌ها و کارها پاک می‌شوند. حساب‌ها، نقش‌ها، گردش‌کار و تنظیمات باقی می‌مانند؛ پیش از پاکسازی بکاپ ایمنی ساخته می‌شود.'

  return (
    <>
      <section className={cn(panelBox, 'mt-5 p-4 sm:p-5')}>
        <h2 className={panelH2}>پشتیبان‌گیری و پاکسازی سرور</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">فایل‌ها با AES-256-GCM و رمز جداگانهٔ شما رمزگذاری می‌شوند. برای بازیابی، هم فایل و هم رمز آن لازم است؛ رمز را در اختیار دیگران نگذارید.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {canExport && <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <b className="block text-sm text-slate-800 dark:text-slate-100">استخراج بکاپ</b>
            <p className="mt-2 min-h-12 text-xs leading-6 text-slate-500 dark:text-slate-400">دریافت یک فایل رمزگذاری‌شده از کل سامانه، شامل حساب‌ها و هش رمزها.</p>
            <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => begin('export')}>دانلود بکاپ کامل</Button>
          </div>}
          {canRestore && <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <b className="block text-sm text-slate-800 dark:text-slate-100">بازیابی بکاپ</b>
            <p className="mt-2 min-h-12 text-xs leading-6 text-slate-500 dark:text-slate-400">جایگزینی کامل داده‌های فعلی با محتویات یک فایل بکاپ معتبر.</p>
            <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => begin('restore')}>انتخاب و بازیابی فایل</Button>
          </div>}
          {canPurge && <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
            <b className="block text-sm text-rose-800 dark:text-rose-200">پاکسازی کامل داده‌های عملیاتی</b>
            <p className="mt-2 min-h-12 text-xs leading-6 text-rose-700 dark:text-rose-300">حساب‌ها و تنظیمات حفظ می‌شوند؛ داده‌های عملیاتی و سوابق پاک خواهند شد.</p>
            <Button type="button" variant="dangerGhost" className="mt-3 w-full" onClick={() => begin('purge')}>پاکسازی سرور…</Button>
          </div>}
        </div>
        {notice && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" role="status">{notice}</p>}
        {error && !mode && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm leading-6 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" role="alert">{error}</p>}
        {safetyBackupId && <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => { void downloadSafetyBackup(safetyBackupId).catch(cause => setError(cause instanceof Error ? cause.message : 'دانلود بکاپ ایمنی ناموفق بود.')) }}>دانلود دوبارهٔ بکاپ ایمنی</Button>
          {completion === 'restore'
            ? <Button type="button" variant="primary" onClick={() => window.location.replace('/')}>رفتن به صفحهٔ ورود</Button>
            : completion === 'purge'
              ? <Button type="button" variant="primary" onClick={() => window.location.reload()}>تازه‌کردن سامانه</Button>
              : null}
        </div>}
      </section>

      {mode && <div className={backdropCls} onClick={event => { if (event.target === event.currentTarget) close() }}>
        <form className={cn(modalBox, modalFormLayout)} onSubmit={event => void submit(event)}>
          <Button type="button" variant="ghost" size="xs" className="x" disabled={busy} onClick={() => close()} title="بستن" aria-label="بستن">بستن</Button>
          <small>پشتیبان‌گیری و نگهداری داده</small>
          <h2>{formTitle}</h2>
          <p>{formDescription}</p>

          {mode === 'restore' && <>
            <label className={labelCls}>فایل بکاپ (.nabbak) *
              <input className={inputCls} type="file" accept=".nabbak,application/octet-stream" required disabled={busy} onChange={event => setBackupFile(event.target.files?.[0] ?? null)} />
            </label>
            <div className="form-grid">
              <label className={labelCls}>رمز فایل بکاپ (برای NABDB2)<PasswordField minLength={12} autoComplete="off" value={archivePassword} onChange={event => setArchivePassword(event.target.value)} /><small className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">فایل‌های قدیمی CLI با سرآیند NABDB1 از backup_key خصوصی هاست استفاده می‌کنند.</small></label>
              <label>تأیید عملیات *<input className={inputCls} required value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="بازیابی کامل سامانه" /></label>
            </div>
          </>}

          {mode === 'export' && <div className="form-grid">
            <label>رمز جدید فایل بکاپ *<PasswordField required minLength={12} autoComplete="new-password" value={backupPassword} onChange={event => setBackupPassword(event.target.value)} /></label>
            <label>تکرار رمز فایل بکاپ *<PasswordField required minLength={12} autoComplete="new-password" value={backupPasswordAgain} onChange={event => setBackupPasswordAgain(event.target.value)} /></label>
          </div>}

          {mode !== 'export' && <div className="form-grid">
            <label>رمز جدید بکاپ ایمنی *<PasswordField required minLength={12} autoComplete="new-password" value={safetyPassword} onChange={event => setSafetyPassword(event.target.value)} /></label>
            <label>تکرار رمز بکاپ ایمنی *<PasswordField required minLength={12} autoComplete="new-password" value={safetyPasswordAgain} onChange={event => setSafetyPasswordAgain(event.target.value)} /></label>
          </div>}

          {mode === 'purge' && <label className={labelCls}>برای تأیید، عبارت «پاکسازی داده‌ها» را دقیق وارد کنید *
            <input className={inputCls} required value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="پاکسازی داده‌ها" />
          </label>}

          <label className={labelCls}>رمز ورود فعلی حساب شما *<PasswordField required autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
          {mode !== 'export' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">رمز فایل بکاپ ایمنی را فراموش نکنید. فایل ایمنی بیرون از پوشهٔ عمومی هاست نگهداری می‌شود و پس از دانلود نیز رمز آن لازم است.</p>}
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm leading-6 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" role="alert">{error}</p>}
          <div className="modal-actions">
            <Button type="button" variant="outline" disabled={busy} onClick={() => close()}>انصراف</Button>
            <Button type="submit" variant={mode === 'purge' ? 'dangerGhost' : 'primary'} loading={busy} loadingText="در حال پردازش…">{mode === 'export' ? 'ساخت و دانلود بکاپ' : mode === 'restore' ? 'تأیید بازیابی کامل' : 'تأیید پاکسازی سرور'}</Button>
          </div>
        </form>
      </div>}
    </>
  )
}
