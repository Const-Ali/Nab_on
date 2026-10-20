import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../common/Button'
import { errorBox, inputCls, labelCls } from '../ui'

export function SetupAdmin({ onSetup, onBack }: { onSetup: (input: { setup_key: string; username: string; name: string; password: string }) => Promise<void>; onBack: () => void }) {
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
    if (!/^[a-z0-9_.-]{3,64}$/.test(cleanUsername)) { setError('نام کاربری باید ۳ تا ۶۴ نویسه و شامل حروف لاتین، عدد، نقطه، خط تیره یا زیرخط باشد.'); return }
    if (password.length < 12) { setError('رمز مدیر باید حداقل ۱۲ نویسه باشد.'); return }
    if (password !== confirm) { setError('تکرار رمز عبور با رمز جدید مطابقت ندارد.'); return }
    setBusy(true)
    try {
      await onSetup({ setup_key: setupKey, username: cleanUsername, name: name.trim(), password })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'راه‌اندازی انجام نشد.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950" dir="rtl">
      <form className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8" onSubmit={submit}>
        <div className="mb-6"><span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-lg font-black text-white">ن</span><h1 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">راه‌اندازی امن سامانه</h1><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">این مرحله فقط یک‌بار، برای ساخت مدیر اولیهٔ هاست انجام می‌شود. کلید راه‌اندازی را از فایل پیکربندی خصوصی هاست وارد کنید.</p></div>
        <label className={labelCls}>کلید راه‌اندازی<input className={inputCls} type="password" dir="ltr" autoComplete="off" required value={setupKey} onChange={event => setSetupKey(event.target.value)} /></label>
        <label className={`${labelCls} mt-4`}>نام مدیر<input className={inputCls} required maxLength={160} value={name} onChange={event => setName(event.target.value)} /></label>
        <label className={`${labelCls} mt-4`}>نام کاربری<input className={inputCls} required minLength={3} maxLength={64} dir="ltr" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} /></label>
        <label className={`${labelCls} mt-4`}>رمز عبور مدیر<input className={inputCls} type="password" required minLength={12} dir="ltr" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label className={`${labelCls} mt-4`}>تکرار رمز عبور<input className={inputCls} type="password" required minLength={12} dir="ltr" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} /></label>
        {error && <div className={`${errorBox} mt-4`}>{error}</div>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onBack}>بازگشت به ورود</Button>
          <Button type="submit" variant="primary" loading={busy} loadingText="در حال راه‌اندازی...">ایجاد مدیر و شروع</Button>
        </div>
      </form>
    </main>
  )
}
