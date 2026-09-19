import { useState } from 'react'
import type { FormEvent } from 'react'
import { load, save } from '../../shared'
import type { User } from '../../types'
import { btnPrimary, errorBox, inputCls, labelCls } from '../ui'

export function Login({ onLogin, users }: { onLogin: (user: User, remember: boolean) => void; users: User[] }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!username || !password) { setError('نام کاربری و رمز عبور الزامی است.'); return }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const key = username.trim().toLowerCase()
      const locks = load<Record<string, { count: number; until: number }>>('nab:lock', {})
      const now = Date.now()
      const lock = locks[key]
      if (lock && lock.until > now) { setError(`حساب به‌علت تلاش‌های ناموفق تا ${Math.max(1, Math.ceil((lock.until - now) / 60000)).toLocaleString('fa-IR')} دقیقه دیگر قفل است.`); return }
      const found = users.find(u => u.username === key && u.password === password)
      if (!found) {
        const count = (lock?.count ?? 0) + 1
        locks[key] = count >= 5 ? { count: 0, until: now + 5 * 60 * 1000 } : { count, until: 0 }
        save('nab:lock', locks)
        setError(count >= 5 ? '۵ تلاش ناموفق! حساب ۵ دقیقه قفل شد.' : `نام کاربری یا رمز عبور نادرست است. (${count.toLocaleString('fa-IR')}/۵)`)
        return
      }
      delete locks[key]
      save('nab:lock', locks)
      if (!found.active) { setError('حساب کاربری شما غیرفعال است؛ با مدیر سیستم تماس بگیرید.'); return }
      onLogin(found, remember)
    }, 400)
  }
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2 dark:bg-slate-950" dir="rtl">
      <section className="hidden flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500 text-xl font-black shadow-lg shadow-indigo-500/25">ن</div>
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">مدیریت هوشمند<br /><i className="font-normal text-indigo-300">پرونده‌های سازمانی</i></h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">همه‌چیز برای مدیریت دقیق، امن و شفاف در یک سامانه.</p>
          <div className="mt-8 flex flex-col gap-3 text-sm text-slate-200"><span>✓ دسترسی امن و سطح‌بندی شده</span><span>✓ گزارش‌گیری لحظه‌ای</span></div>
        </div>
      </section>
      <main className="flex items-center justify-center p-5 sm:p-8">
      <form className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none" onSubmit={submit}>
        <div className="mb-8"><div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-lg font-black text-white lg:hidden">ن</div><h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">خوش آمدید</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">برای ورود به سامانه وارد شوید</p></div>
        <label className={labelCls}>نام کاربری<input className={inputCls} value={username} onChange={e => { setUsername(e.target.value); setError('') }} autoComplete="username" /></label>
        <label className={`${labelCls} mt-4`}>رمز عبور<input className={inputCls} type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} autoComplete="current-password" /></label>
        {error && <div className={errorBox}>{error}</div>}
        <div className="mt-5 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><input className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> مرا به خاطر بسپار</label>
          <span className="text-xs text-slate-500 dark:text-slate-400">فراموشی رمز؟ با مدیر سیستم تماس بگیرید</span>
        </div>
        <button className={`${btnPrimary} mt-6 w-full`} disabled={loading}>{loading ? 'در حال بررسی...' : 'ورود به سامانه ←'}</button>
        <small className="mt-4 block text-center text-xs leading-5 text-slate-500 dark:text-slate-400">حساب مدیر: admin / admin — سایر حساب‌ها را مدیر سیستم ایجاد می‌کند</small>
      </form>
      </main>
    </div>
  )
}
