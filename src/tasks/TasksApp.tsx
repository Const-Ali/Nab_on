import { useEffect, useState } from 'react'
import { load, save } from '../shared'
import { Icon } from '../shared-ui'
import WorkManagementPage from './WorkManagementPage'
import type { UserLite } from './types'

type StoredUser = { username?: string; name?: string }

export default function TasksApp() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => load('nab:theme', 'light'))
  useEffect(() => { document.documentElement.dataset.theme = theme; save('nab:theme', theme) }, [theme])

  const session = load<{ username?: string } | null>('nab:session', null)
  useEffect(() => {
    if (!session?.username) window.location.replace('./index.html')
  }, [session?.username])
  if (!session?.username) return null

  const storedUsers = load<StoredUser[]>('nab:users', [])
  const users: UserLite[] = storedUsers
    .filter((u): u is { username: string; name: string } => typeof u.username === 'string' && typeof u.name === 'string')
    .map(u => ({ username: u.username, name: u.name }))
  const meName = users.find(u => u.username === session.username)?.name ?? session.username

  return (
    <div className="tasks-app" dir="rtl">
      <header className="tasks-topbar">
        <div className="tasks-topbar-right">
          <a className="tasks-back" href="./index.html" title="بازگشت به سامانه ناب"><Icon name="logout" /> بازگشت به ناب</a>
          <span className="tasks-brand"><b>مدیریت کارهای من</b><small>داشبورد خصوصی {meName} · سامانه ناب</small></span>
        </div>
        <button
          type="button"
          className="theme-btn"
          onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
          title={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
          aria-label="تغییر تم"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </header>
      <main className="tasks-content">
        <WorkManagementPage users={users} sessionUsername={session.username} sessionName={meName} />
      </main>
    </div>
  )
}
