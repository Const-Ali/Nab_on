import { ThemeToggle } from '../components/common/ThemeToggle'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { loadTheme, save } from '../shared'
import { applySavedFont } from '../app-lib'
import { ApiError, bootstrap, fetchTasks, syncTasks } from '../api-client'
import WorkManagementPage from './WorkManagementPage'
import { normalizeTask } from './utils'
import type { Permission, ThemeMode } from '../types'
import type { UserLite, WorkTask } from './types'

export default function TasksApp() {
  const [theme, setTheme] = useState<ThemeMode>(loadTheme)
  const [user, setUser] = useState<UserLite | null>(null)
  const [users, setUsers] = useState<UserLite[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [tasks, setTasks] = useState<WorkTask[] | null>(null)
  const [error, setError] = useState('')
  const [syncError, setSyncError] = useState('')

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
        if (!session.user.permissions.includes('view_tasks')) {
          if (active) setError('برای مشاهدهٔ کارهای من، از مدیر سامانه بخواهید مجوز مربوط را در نقش یا حساب شما فعال کند.')
          return
        }
        const data = await fetchTasks()
        if (!active) return
        setUser({ username: session.user.username, name: session.user.name })
        setPermissions(session.user.permissions)
        setUsers(session.users.filter(u => u.active).map(u => ({ username: u.username, name: u.name })))
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

  const saveTasksOnHost = useCallback(async (nextTasks: WorkTask[]) => {
    try {
      const result = await syncTasks(nextTasks, user?.username ?? '')
      setSyncError('')
      return result.tasks.map((task, index) => normalizeTask(task, index))
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : 'ذخیرهٔ کارها روی هاست ناموفق بود.')
      throw cause
    }
  }, [user])

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
      {syncError && <div className="mx-auto mt-3 max-w-5xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">ذخیره‌سازی روی هاست ناموفق بود: {syncError}</div>}
      <main className="tasks-content">
        <WorkManagementPage users={users} sessionUsername={user.username} sessionName={user.name} initialTasks={tasks} canCreate={permissions.includes('create_task')} canEdit={permissions.includes('edit_task')} canChangeStatus={permissions.includes('change_task_status')} canDelete={permissions.includes('delete_task')} onTasksChange={saveTasksOnHost} />
      </main>
    </div>
  )
}
