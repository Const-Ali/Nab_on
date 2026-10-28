import { ThemeToggle } from '../components/common/ThemeToggle'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { loadTheme, save } from '../shared'
import { applySavedFont } from '../app-lib'
import { ApiError, bootstrap, fetchTasks, hasRecentUserActivity, logout, syncTasks, touchSession } from '../api-client'
import type { AppBootstrap } from '../api-client'
import WorkManagementPage from './WorkManagementPage'
import { normalizeTask } from './utils'
import type { Permission, ThemeMode } from '../types'
import type { UserLite, WorkTask } from './types'

export default function TasksApp() {
  const [theme, setTheme] = useState<ThemeMode>(loadTheme)
  const [user, setUser] = useState<UserLite | null>(null)
  const [users, setUsers] = useState<UserLite[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [sessionPolicy, setSessionPolicy] = useState<AppBootstrap['session_policy']>()
  const [tasks, setTasks] = useState<WorkTask[] | null>(null)
  const [error, setError] = useState('')
  const [syncError, setSyncError] = useState('')
  const [pendingTasks, setPendingTasks] = useState<WorkTask[] | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => { applySavedFont() }, [])
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    save('nab:theme', theme)
  }, [theme])

  useEffect(() => {
    let active = true
    const onAuthExpired = () => window.location.replace('/')
    window.addEventListener('nab:auth-expired', onAuthExpired)
    const loadUserTasks = async () => {
      try {
        const session = await bootstrap()
        if (!active) return
        setSessionPolicy(session.session_policy)
        setUser({ username: session.user.username, name: session.user.name })
        setPermissions(session.user.permissions)
        setUsers(session.users.filter(u => u.active).map(u => ({ username: u.username, name: u.name })))
        if (!session.user.permissions.includes('view_tasks')) {
          setError('برای مشاهدهٔ کارهای من، از مدیر سامانه بخواهید مجوز مربوط را در نقش یا حساب شما فعال کند.')
          return
        }
        const data = await fetchTasks()
        if (!active) return
        setTasks(data.map((task, index) => normalizeTask(task, index)))
      } catch (cause) {
        if (!active) return
        if (cause instanceof ApiError && cause.status === 401) {
          window.location.replace('/')
          return
        }
        setError(cause instanceof Error ? cause.message : 'بارگذاری کارها از هاست ناموفق بود.')
      }
    }
    void loadUserTasks()
    return () => {
      active = false
      window.removeEventListener('nab:auth-expired', onAuthExpired)
    }
  }, [])

  useEffect(() => {
    if (!user?.username || !sessionPolicy?.auto_logout) return
    const allowedMinutes = [5, 10, 15, 30, 60]
    const minutes = allowedMinutes.includes(sessionPolicy.auto_logout_mins) ? sessionPolicy.auto_logout_mins : 30
    const timeoutMs = minutes * 60_000
    const serverRemainingSeconds = sessionPolicy.auto_logout_remaining_seconds
    const remainingMs = typeof serverRemainingSeconds === 'number' && Number.isFinite(serverRemainingSeconds)
      ? Math.min(timeoutMs, Math.max(0, serverRemainingSeconds * 1000))
      : timeoutMs
    let idleDeadline = Date.now() + remainingMs
    let expired = false
    let timer = 0
    const expire = () => {
      if (expired) return
      expired = true
      // Let the server clear the session before reloading the main app; recent
      // heartbeats can make the server-side idle boundary slightly later than ours.
      const logoutRequest = logout().catch(() => undefined)
      const fallback = new Promise<void>(resolve => { window.setTimeout(resolve, 1500) })
      void Promise.race([logoutRequest, fallback]).finally(() => {
        window.dispatchEvent(new CustomEvent('nab:auth-expired'))
      })
    }
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (Date.now() >= idleDeadline) expire()
        else schedule()
      }, Math.max(0, idleDeadline - Date.now()))
    }
    const markActivity = () => {
      if (expired) return
      idleDeadline = Date.now() + timeoutMs
      schedule()
    }
    const checkAfterVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() >= idleDeadline) expire()
    }
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
    for (const event of activityEvents) window.addEventListener(event, markActivity, { passive: true })
    document.addEventListener('visibilitychange', checkAfterVisibility)
    schedule()
    return () => {
      expired = true
      window.clearTimeout(timer)
      for (const event of activityEvents) window.removeEventListener(event, markActivity)
      document.removeEventListener('visibilitychange', checkAfterVisibility)
    }
  }, [user?.username, sessionPolicy?.auto_logout, sessionPolicy?.auto_logout_mins, sessionPolicy?.auto_logout_remaining_seconds])

  useEffect(() => {
    if (!user?.username) return
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && hasRecentUserActivity(75_000)) {
        void touchSession().catch(() => undefined)
      }
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [user?.username])

  const saveTasksOnHost = useCallback(async (nextTasks: WorkTask[]) => {
    try {
      const result = await syncTasks(nextTasks, user?.username ?? '')
      setSyncError('')
      setPendingTasks(null)
      return result.tasks.map((task, index) => normalizeTask(task, index))
    } catch (cause) {
      setPendingTasks(nextTasks)
      setSyncError(cause instanceof Error ? cause.message : 'ذخیرهٔ کارها روی هاست ناموفق بود.')
      throw cause
    }
  }, [user])

  const retrySave = useCallback(async () => {
    if (!pendingTasks || isRetrying) return
    setIsRetrying(true)
    try {
      const result = await syncTasks(pendingTasks, user?.username ?? '')
      setSyncError('')
      setPendingTasks(null)
      setTasks(result.tasks.map((task, index) => normalizeTask(task, index)))
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : 'ذخیرهٔ کارها روی هاست ناموفق بود.')
    } finally {
      setIsRetrying(false)
    }
  }, [pendingTasks, isRetrying, user])

  if (error) {
    return <main className="auth-safe-shell grid min-h-svh place-items-center bg-slate-50 p-6 text-center dark:bg-slate-950" dir="rtl"><div className="max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-sm leading-7 text-rose-700 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300"><p>{error}</p><a className="mt-4 inline-block font-semibold text-indigo-600" href="/">بازگشت به ورود</a></div></main>
  }
  if (!user || !tasks) return <main className="auth-safe-shell grid min-h-svh place-items-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400" dir="rtl">در حال دریافت کارها از هاست…</main>

  return (
    <div className={`tasks-app${theme === 'dark' ? ' dark' : ''}`} dir="rtl">
      <header className="tasks-topbar">
        <div className="tasks-topbar-right">
          <a className="tasks-back" href="/" onClick={event => { event.preventDefault(); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }} title="بازگشت به سامانه ناب">بازگشت به ناب</a>
          <span className="tasks-brand"><b>مدیریت کارهای من</b><small>داشبورد خصوصی {user.name} · سامانه ناب</small></span>
        </div>
        <ThemeToggle
          theme={theme}
          onToggle={() => {
            setTheme(current => current === 'dark' ? 'light' : 'dark')
          }}
        />
      </header>
      {syncError && <div className="mx-auto mt-3 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"><span>ذخیره‌سازی روی هاست ناموفق بود: {syncError} — تغییرات شما حفظ شده است و با «تلاش مجدد» می‌توانید دوباره امتحان کنید.</span><button type="button" onClick={retrySave} disabled={isRetrying} className="shrink-0 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50">{isRetrying ? 'در حال تلاش…' : 'تلاش مجدد'}</button></div>}
      <main className="tasks-content">
        <WorkManagementPage users={users} sessionUsername={user.username} sessionName={user.name} initialTasks={tasks} canCreate={permissions.includes('create_task')} canEdit={permissions.includes('edit_task')} canChangeStatus={permissions.includes('change_task_status')} canDelete={permissions.includes('delete_task')} onTasksChange={saveTasksOnHost} />
      </main>
    </div>
  )
}
