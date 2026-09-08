import { useState } from 'react'
import type { FormEvent } from 'react'
import { load, save } from '../../shared'
import type { User } from '../../types'

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
    <div className="login" dir="rtl">
      <section>
        <div className="login-brand">ن</div>
        <h1>مدیریت هوشمند<br /><i>پرونده‌های سازمانی</i></h1>
        <p>همه‌چیز برای مدیریت دقیق، امن و شفاف در یک سامانه.</p>
        <span>✓ دسترسی امن و سطح‌بندی شده</span>
        <span>✓ گزارش‌گیری لحظه‌ای</span>
      </section>
      <form onSubmit={submit}>
        <div className="form-brand">ن <b>خوش آمدید</b><small>برای ورود به سامانه وارد شوید</small></div>
        <label>نام کاربری<input value={username} onChange={e => { setUsername(e.target.value); setError('') }} autoComplete="username" /></label>
        <label>رمز عبور<input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} autoComplete="current-password" /></label>
        {error && <div className="error">{error}</div>}
        <div className="login-row">
          <label className="remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> مرا به خاطر بسپار</label>
          <span className="login-hint">فراموشی رمز؟ با مدیر سیستم تماس بگیرید</span>
        </div>
        <button className="primary" disabled={loading}>{loading ? 'در حال بررسی...' : 'ورود به سامانه ←'}</button>
        <small className="demo">حساب مدیر: admin / admin — سایر حساب‌ها را مدیر سیستم ایجاد می‌کند</small>
      </form>
    </div>
  )
}
