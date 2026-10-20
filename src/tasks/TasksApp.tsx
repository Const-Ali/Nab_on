import { Button } from '../components/common/Button'
import { useEffect, useState } from 'react'
import { load, save } from '../shared'
import { applySavedFont } from '../app-lib'
import WorkManagementPage from './WorkManagementPage'
import type { UserLite } from './types'

type StoredUser = { username?: string; name?: string }

export default function TasksApp() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => load('nab:theme', 'light'))
  useEffect(() => { applySavedFont() }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; save('nab:theme', theme) }, [theme])

  const session = load<{ username?: string } | null>('nab:session', null)
  useEffect(() => {
    if (!session?.username) window.location.replace('/')
  }, [session?.username])
  if (!session?.username) return null

  const storedUsers = load<StoredUser[]>('nab:users', [])
  const users: UserLite[] = storedUsers
    .filter((u): u is { username: string; name: string } => typeof u.username === 'string' && typeof u.name === 'string')
    .map(u => ({ username: u.username, name: u.name }))
  const meName = users.find(u => u.username === session.username)?.name ?? session.username

  return (
    <div className={`tasks-app${theme === 'dark' ? ' dark' : ''}`} dir="rtl">
      <header className="tasks-topbar">
        <div className="tasks-topbar-right">
          <a className="tasks-back" href="/" onClick={event => { event.preventDefault(); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }} title="بازگشت به سامانه ناب">بازگشت به ناب</a>
          <span className="tasks-brand"><b>مدیریت کارهای من</b><small>داشبورد خصوصی {meName} · سامانه ناب</small></span>
        </div>
        <Button
          variant="outline"
          size="sm"
          active={theme === 'dark'}
          onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
          title={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
          aria-label={theme === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
        >
          {theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
        </Button>
      </header>
      <main className="tasks-content">
        <WorkManagementPage users={users} sessionUsername={session.username} sessionName={meName} />
      </main>
    </div>
  )
}
