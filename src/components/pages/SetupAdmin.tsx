import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../common/Button'
import { ThemeToggle } from '../common/ThemeToggle'
import { PasswordField } from '../common/PasswordField'
import type { ThemeMode } from '../../types'
import { errorBox, inputCls, labelCls } from '../ui'

export function SetupAdmin({ onSetup, onBack, theme, onToggleTheme }: {
  onSetup: (input: { setup_key: string; username: string; name: string; password: string }) => Promise<void>
  onBack: () => void
  theme: ThemeMode
  onToggleTheme: () => void
}) {
  const [setupKey, setSetupKey] = useState('')
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const cleanUsername = username.trim().toLowerCase()
    if (!setupKey) { setError('کلید راه‌اندازی را عیناً از فایل پیکربندی خصوصی هاست وارد کنید.'); return }
    if (setupKey.length < 32) { setError('کلید راه‌اندازی باید دست‌کم ۳۲ نویسه باشد؛ مقدار فایل پیکربندی را بررسی کنید.'); return }
    if (!name.trim()) { setError('نام نمایشی مدیر را وارد کنید.'); return }
    if (!/^[a-z0-9_.-]{3,64}$/.test(cleanUsername)) { setError('نام کاربری باید ۳ تا ۶۴ نویسه و شامل حروف لاتین، عدد، نقطه، خط تیره یا زیرخط باشد.'); return }
    if (password.length < 12) { setError('رمز مدیر باید حداقل ۱۲ نویسه باشد.'); return }
    if (password !== confirm) { setError('تکرار رمز عبور با رمز جدید مطابقت ندارد.'); return }
    setBusy(true)
    try {
      await onSetup({ setup_key: setupKey, username: cleanUsername, name: name.trim(), password })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'راه‌اندازی انجام نشد.'
      setError(message.includes('کلید راه‌اندازی')
        ? 'کلید راه‌اندازی با مقدار تنظیم‌شده روی هاست مطابقت ندارد. مقدار setup_key در فایل خصوصی nab-config.php را دقیق و بدون فاصلهٔ اضافه بررسی کنید؛ کلید را با کسی به اشتراک نگذارید.'
        : message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-safe-shell relative flex min-h-svh items-start justify-center bg-slate-50 px-4 pb-6 pt-20 dark:bg-slate-950 sm:items-center sm:px-6 sm:py-8" dir="rtl">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} className="auth-safe-toggle absolute" />
      <form className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8" onSubmit={submit}>
        <div className="mb-6"><span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-lg font-black text-white">ن</span><h1 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">راه‌اندازی امن سامانه</h1><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">این مرحله فقط یک‌بار، برای ساخت مدیر اولیهٔ هاست انجام می‌شود. کلید راه‌اندازی را از فایل پیکربندی خصوصی هاست وارد کنید.</p></div>
        <label className={labelCls} htmlFor="setup-key">کلید راه‌اندازی<input id="setup-key" className={inputCls} type="password" dir="ltr" autoComplete="off" required value={setupKey} onChange={event => { setSetupKey(event.target.value); setError('') }} aria-describedby="setup-key-help" /></label>
        <p id="setup-key-help" className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">مقدار را دقیقاً از <code dir="ltr">setup_key</code> در فایل خصوصی پیکربندی هاست کپی کنید؛ فاصلهٔ اضافه وارد نکنید.</p>
        <label className={`${labelCls} mt-4`} htmlFor="setup-name">نام نمایشی مدیر<input id="setup-name" className={inputCls} required maxLength={160} autoComplete="name" value={name} onChange={event => { setName(event.target.value); setError('') }} /></label>
        <label className={`${labelCls} mt-4`} htmlFor="setup-username">نام کاربری<input id="setup-username" className={inputCls} required minLength={3} maxLength={64} dir="ltr" autoComplete="username" value={username} onChange={event => { setUsername(event.target.value); setError('') }} aria-describedby="setup-username-help" /></label>
        <p id="setup-username-help" className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">۳ تا ۶۴ نویسه؛ فقط حروف لاتین کوچک، عدد، نقطه، خط تیره و زیرخط.</p>
        <div className={`${labelCls} mt-4`}><label htmlFor="setup-password">رمز عبور مدیر</label><PasswordField id="setup-password" required minLength={12} dir="ltr" autoComplete="new-password" value={password} onChange={event => { setPassword(event.target.value); setError('') }} aria-describedby="setup-password-help" /></div>
        <p id="setup-password-help" className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">برای امنیت حساب، دست‌کم ۱۲ نویسه انتخاب کنید.</p>
        <div className={`${labelCls} mt-4`}><label htmlFor="setup-confirm">تکرار رمز عبور</label><PasswordField id="setup-confirm" required minLength={12} dir="ltr" autoComplete="new-password" value={confirm} onChange={event => { setConfirm(event.target.value); setError('') }} /></div>
        {error && <div className={`${errorBox} mt-4`} role="alert" aria-live="assertive">{error}</div>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onBack}>بازگشت به ورود</Button>
          <Button type="submit" variant="primary" loading={busy} loadingText="در حال راه‌اندازی...">ایجاد مدیر و شروع</Button>
        </div>
      </form>
    </main>
  )
}
