import { Button } from './components/common/Button'
import { useEffect, useMemo, useState } from 'react'
import {
  jalaliMonthNames,
  jalaliParts,
  load,
  nowStamp,
  nowTs,
  playChime,
  save,
  sendBrowserNotification,
  uid,
} from './shared'
import {
  ApiError,
  bootstrap as bootstrapServer,
  deleteUser as deleteUserOnServer,
  getSetupStatus,
  importLegacyState,
  importLegacyTasks,
  login as loginOnServer,
  logout as logoutFromServer,
  saveUser as createUserOnServer,
  setupAdmin as setupAdminOnServer,
  syncSave,
  updateProfile as updateProfileOnServer,
  updateUser as updateUserOnServer,
} from './api-client'
import { Avatar, MiniCalendar } from './shared-ui'
import {
  deadlineLeft,
  defaultRoles,
  normalizeUser,
  downloadCsv,
  applySavedFont,
} from './app-lib'
import type {
  Status,
  Page,
  Permission,
  RoleDef,
  Person,
  Activity,
  Audit,
  User,
  Note,
  PersonFilter,
  ThemeMode,
} from './types'
import { Login } from './components/pages/Login'
import { SetupAdmin } from './components/pages/SetupAdmin'
import { Dashboard } from './components/pages/Dashboard'
import { Persons } from './components/pages/Persons'
import { WorkflowBoard } from './components/pages/WorkflowBoard'
import { Activities } from './components/pages/Activities'
import { Users } from './components/pages/Users'
import { Reports } from './components/pages/Reports'
import { Settings } from './components/pages/Settings'
import { PersonModal } from './components/modals/PersonModal'
import { CreateModal } from './components/modals/CreateModal'
import { RoleModal } from './components/modals/RoleModal'
import { AddUserModal } from './components/modals/AddUserModal'
import { EditModal } from './components/modals/EditModal'
import { EditUserModal } from './components/modals/EditUserModal'
import { LiveClock } from './components/common/LiveClock'
import { LegacyDataMigration, type LegacySnapshot } from './components/common/LegacyDataMigration'
import { ProfileModal } from './components/modals/ProfileModal'
import { SearchModal } from './components/modals/SearchModal'
import { PrintPerson } from './components/common/PrintPerson'
import { PrintReport } from './components/common/PrintReport'
import { cn } from './components/ui'

const legacyKeys = ['nab:people', 'nab:activities', 'nab:audit', 'nab:roles', 'nab:notes'] as const

function readLegacySnapshot(username: string, includeSharedData: boolean): LegacySnapshot | null {
  const state: Record<string, unknown[]> = {}
  try {
    if (includeSharedData) {
      for (const key of legacyKeys) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const value: unknown = JSON.parse(raw)
        if (Array.isArray(value) && value.length) state[key] = value
      }
    }
    const ownTasks = localStorage.getItem(`nab:tasks:${username}`)
    if (ownTasks) {
      const value: unknown = JSON.parse(ownTasks)
      if (Array.isArray(value) && value.length) state.tasks = value
    } else {
      const rawTasks = localStorage.getItem('nab:tasks')
      if (rawTasks) {
        const value: unknown = JSON.parse(rawTasks)
        if (Array.isArray(value)) {
          const mine = value.filter(raw => {
            const task = raw as { assignee?: string; createdBy?: string }
            return task.assignee === username || task.createdBy === username
          })
          if (mine.length) state.tasks = mine
        }
      }
    }
    const hasLegacyUsers = includeSharedData && Boolean(localStorage.getItem('nab:users'))
    return Object.keys(state).length || hasLegacyUsers ? { state, hasLegacyUsers } : null
  } catch {
    return null
  }
}

function clearLegacyLocalData(username: string, includeSharedData: boolean) {
  try {
    const keys = [`nab:tasks:${username}`]
    if (includeSharedData) keys.push(...legacyKeys, 'nab:users', 'nab:session', 'nab:lock')
    for (const key of keys) localStorage.removeItem(key)
    const rawTasks = localStorage.getItem('nab:tasks')
    if (rawTasks) {
      const value: unknown = JSON.parse(rawTasks)
      if (Array.isArray(value)) {
        const remaining = value.filter(raw => {
          const task = raw as { assignee?: string; createdBy?: string }
          return task.assignee !== username && task.createdBy !== username
        })
        if (remaining.length) localStorage.setItem('nab:tasks', JSON.stringify(remaining))
        else localStorage.removeItem('nab:tasks')
      }
    }
  } catch {
    // If storage is unavailable, the server data remains unaffected.
  }
}

function downloadLegacySnapshot(snapshot: LegacySnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'nab-browser-backup.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function App() {
  const [session, setSession] = useState<{ username: string } | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [serverReady, setServerReady] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [serverMessage, setServerMessage] = useState('')

  const [page, setPage] = useState<Page>('dashboard')
  const [people, setPeople] = useState<Person[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PersonFilter>('همه وضعیت‌ها')
  const [tagFilter, setTagFilter] = useState('همه برچسب‌ها')
  const [sortBy, setSortBy] = useState('default')
  const [selected, setSelected] = useState<Person | null>(null)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [audit, setAudit] = useState<Audit[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<RoleDef[]>([])
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [addRoleOpen, setAddRoleOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(() => load('nab:sidebar-collapsed', false))
  const [theme, setTheme] = useState<ThemeMode>(() => load<ThemeMode>('nab:theme', 'light'))
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [isServerConnected, setIsServerConnected] = useState<boolean | null>(null)
  const [legacySnapshot, setLegacySnapshot] = useState<LegacySnapshot | null>(null)
  const [legacyCanImport, setLegacyCanImport] = useState(false)

  const applyServerBootstrap = (data: Awaited<ReturnType<typeof bootstrapServer>>) => {
    setSession({ username: data.user.username })
    setUsers(data.users.map(normalizeUser))
    setPeople(Array.isArray(data.state['nab:people']) ? data.state['nab:people'] as Person[] : [])
    setActivities(Array.isArray(data.state['nab:activities']) ? data.state['nab:activities'] as Activity[] : [])
    setAudit(Array.isArray(data.state['nab:audit']) ? data.state['nab:audit'] as Audit[] : [])
    setRoles(Array.isArray(data.state['nab:roles']) && data.state['nab:roles'].length ? data.state['nab:roles'] as RoleDef[] : defaultRoles)
    setNotes(Array.isArray(data.state['nab:notes']) ? data.state['nab:notes'] as Note[] : [])
    const isAdmin = data.user.role === 'admin'
    const serverRoles = data.state['nab:roles']
    const currentTasks = data.state.tasks
    const taskMarker = data.state.legacy_tasks_imported
    const sharedMigrationMarker = data.state.legacy_migration_completed
    const serverHasRecords = ['nab:people', 'nab:activities', 'nab:audit', 'nab:notes'].some(key => Array.isArray(data.state[key]) && data.state[key].length > 0)
      || (Array.isArray(serverRoles) && serverRoles.length > defaultRoles.length)
      || (Array.isArray(currentTasks) && currentTasks.length > 0)
      || (Array.isArray(taskMarker) && taskMarker.length > 0)
      || (Array.isArray(sharedMigrationMarker) && sharedMigrationMarker.length > 0)
      || data.users.length > 1
    const legacy = readLegacySnapshot(data.user.username, isAdmin)
    setLegacySnapshot(legacy)
    const canImportLegacyTasks = Boolean(legacy?.state.tasks?.length && (!Array.isArray(currentTasks) || currentTasks.length === 0) && (!Array.isArray(taskMarker) || taskMarker.length === 0))
    const hasLegacyState = Boolean(legacy && Object.values(legacy.state).some(rows => rows.length > 0))
    const canImportLegacy = isAdmin
      ? Boolean(hasLegacyState && !serverHasRecords && (!legacy?.state.tasks?.length || canImportLegacyTasks))
      : canImportLegacyTasks
    setLegacyCanImport(canImportLegacy)
    setNeedsSetup(false)
    setServerMessage('')
    setIsServerConnected(true)
    setServerReady(true)
    setAuthReady(true)
  }

  // نشست فقط از سرور خوانده می‌شود؛ اطلاعات حساس در localStorage نگهداری نمی‌شود.
  useEffect(() => {
    let active = true
    const onAuthExpired = () => {
      setSession(null)
      setServerReady(false)
      setUsers([])
      setPeople([])
      setActivities([])
      setAudit([])
      setRoles([])
      setNotes([])
      setServerMessage('نشست شما پایان یافته است؛ دوباره وارد شوید.')
    }
    window.addEventListener('nab:auth-expired', onAuthExpired)
    const initialize = async () => {
      try {
        const setupRequired = await getSetupStatus()
        if (!active) return
        setNeedsSetup(setupRequired)
        setIsServerConnected(true)
        if (setupRequired) {
          setAuthReady(true)
          return
        }
        try {
          const data = await bootstrapServer()
          if (active) applyServerBootstrap(data)
        } catch (cause) {
          if (!active) return
          if (cause instanceof ApiError && cause.status === 401) {
            setSession(null)
            setServerReady(false)
            setServerMessage('برای ادامه وارد حساب کاربری شوید.')
          } else {
            setIsServerConnected(false)
            setServerMessage(cause instanceof Error ? cause.message : 'ارتباط با پایگاه دادهٔ هاست برقرار نشد.')
          }
          setAuthReady(true)
        }
      } catch (cause) {
        if (!active) return
        setIsServerConnected(false)
        setServerMessage(cause instanceof Error ? cause.message : 'تنظیمات PHP/MySQL هاست در دسترس نیست.')
        setAuthReady(true)
      }
    }
    void initialize()
    return () => {
      active = false
      window.removeEventListener('nab:auth-expired', onAuthExpired)
    }
  }, [])

  // تنظیم فونت، تم و نوار کناری؛ این‌ها ترجیح‌های غیرحساسِ همین مرورگر هستند.
  useEffect(() => {
    applySavedFont()
    document.documentElement.dataset.theme = theme
    save('nab:theme', theme)
  }, [theme])
  useEffect(() => { save('nab:sidebar-collapsed', collapsed) }, [collapsed])

  const sessionUsername = session?.username ?? ''
  const currentUser: User | null = useMemo(
    () => sessionUsername ? users.find(user => user.username === sessionUsername && user.active) ?? null : null,
    [users, sessionUsername],
  )

  const has = (p: Permission) => Boolean(currentUser?.permissions.includes(p))

  // داده‌های پرونده فقط روی هاست ذخیره می‌شوند؛ اگر نوشتن ناموفق باشد، وضعیت به کاربر اعلام می‌شود.
  useEffect(() => {
    if (!serverReady || !session) return
    let active = true
    const persist = async () => {
      try {
        const writes: Promise<void>[] = [
          syncSave('nab:activities', activities),
          syncSave('nab:audit', audit),
        ]
        if (currentUser?.permissions.includes('view_persons')) {
          writes.push(syncSave('nab:people', people), syncSave('nab:notes', notes))
        }
        if (currentUser?.permissions.includes('manage_users')) writes.push(syncSave('nab:roles', roles))
        await Promise.all(writes)
        if (active) {
          setIsServerConnected(true)
          setServerMessage('')
        }
      } catch (cause) {
        if (active) {
          const message = cause instanceof Error ? cause.message : 'ذخیره‌سازی روی هاست ناموفق بود.'
          setIsServerConnected(false)
          setServerMessage(message)
          setToast(`ذخیره روی هاست ناموفق بود: ${message}`)
        }
      }
    }
    void persist()
    return () => { active = false }
  }, [people, activities, audit, roles, notes, serverReady, session, currentUser])

  // یادآور سررسید
  useEffect(() => {
    if (session) {
      const urgentPeople = people.filter(p => {
        const left = deadlineLeft(p)
        return left !== null && left <= 1
      })
      if (urgentPeople.length > 0) {
        sendBrowserNotification('یادآور سررسید پرونده‌ها - سامانه ناب', {
          body: `تعداد ${urgentPeople.length} پرونده دارای موعد رسیدگی امروز یا گذشته هستند.`,
        })
      }
    }
  }, [session, people])

  // کلید میانبر Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setThemeMenuOpen(false)
        setMobileMoreOpen(false)
        setCalOpen(false)
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!themeMenuOpen && !mobileMoreOpen && !calOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return
      const popover = event.target.closest('[data-app-popover]')?.getAttribute('data-app-popover')
      if (themeMenuOpen && popover !== 'theme') setThemeMenuOpen(false)
      if (mobileMoreOpen && popover !== 'mobile-more') setMobileMoreOpen(false)
      if (calOpen && popover !== 'calendar') setCalOpen(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setThemeMenuOpen(false)
        setMobileMoreOpen(false)
        setCalOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [themeMenuOpen, mobileMoreOpen, calOpen])

  const auditLog = (action: string, target: string) => {
    const entry: Audit = { id: uid('AUD'), action, target, createdAt: nowStamp(), createdBy: currentUser?.name ?? 'کاربر' }
    setAudit(cur => [entry, ...cur])
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const handleLogout = async () => {
    try { await logoutFromServer() } catch { /* The local view is cleared even if the host is offline. */ }
    setSession(null)
    setServerReady(false)
    setUsers([])
    setPeople([])
    setActivities([])
    setAudit([])
    setRoles([])
    setNotes([])
    setProfileOpen(false)
    setServerMessage('از حساب خارج شدید.')
  }

  const handleLegacyImport = async () => {
    if (!legacySnapshot || !legacyCanImport || !currentUser) throw new Error('انتقال داده‌های قدیمی در این وضعیت مجاز نیست.')
    const isAdmin = currentUser.role === 'admin'
    if (isAdmin) await importLegacyState(legacySnapshot.state)
    else await importLegacyTasks(legacySnapshot.state.tasks ?? [])
    clearLegacyLocalData(currentUser.username, isAdmin)
    setLegacySnapshot(null)
    const refreshed = await bootstrapServer()
    applyServerBootstrap(refreshed)
    showToast(isAdmin
      ? 'انتقال داده‌های قدیمی به هاست انجام شد. حساب‌های قدیمی باید دوباره ساخته شوند.'
      : 'کارهای قدیمی این حساب به هاست منتقل شدند.')
  }

  const handleLegacyDiscard = () => {
    if (!currentUser) return
    const isAdmin = currentUser.role === 'admin'
    const warning = isAdmin
      ? 'داده‌های قدیمی همین مرورگر و رمزهای ذخیره‌شدهٔ آن پاک شوند؟ اگر هنوز نسخهٔ پشتیبان نگرفته‌اید، ابتدا آن را دانلود کنید.'
      : 'کارهای قدیمی این حساب از همین مرورگر پاک شوند؟ اگر هنوز نسخهٔ پشتیبان نگرفته‌اید، ابتدا آن را دانلود کنید.'
    if (!window.confirm(warning)) return
    clearLegacyLocalData(currentUser.username, isAdmin)
    setLegacySnapshot(null)
    showToast('داده‌های محلی قدیمی پاک شدند.')
  }

  const openTasksPage = () => {
    setMobileMoreOpen(false)
    setThemeMenuOpen(false)
    setCalOpen(false)
    if (window.location.pathname !== '/tasks') {
      window.history.pushState({}, '', '/tasks')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const handleCreatePerson = (p: Person) => {
    setPeople(cur => [p, ...cur])
    const act: Activity = {
      id: uid('ACT'),
      personId: p.id,
      personName: `${p.firstName} ${p.lastName}`,
      action: 'ثبت پرونده جدید',
      previousStatus: null,
      newStatus: p.status,
      rejectionReason: null,
      createdAt: nowStamp(),
      createdBy: currentUser?.name ?? 'کاربر',
      createdByRole: currentUser?.role ?? 'admin',
      ts: nowTs(),
    }
    setActivities(cur => [act, ...cur])
    auditLog('افزودن فرد جدید', `${p.firstName} ${p.lastName} (${p.id})`)
    setCreateOpen(false)
    playChime('success')
    showToast(`پرونده «${p.firstName} ${p.lastName}» ثبت شد.`)
  }

  const handleUpdateStatus = (p: Person, next: Status, reason: string | null) => {
    const prev = p.status
    const updated: Person = {
      ...p,
      status: next,
      updatedAt: nowStamp(),
      updatedBy: currentUser?.name ?? 'کاربر',
    }
    setPeople(cur => cur.map(x => (x.id === p.id ? updated : x)))
    setSelected(updated)
    const act: Activity = {
      id: uid('ACT'),
      personId: p.id,
      personName: `${p.firstName} ${p.lastName}`,
      action: next === 'رد شده' ? 'رد پرونده' : 'تغییر وضعیت',
      previousStatus: prev,
      newStatus: next,
      rejectionReason: reason,
      createdAt: nowStamp(),
      createdBy: currentUser?.name ?? 'کاربر',
      createdByRole: currentUser?.role ?? 'admin',
      ts: nowTs(),
    }
    setActivities(cur => [act, ...cur])
    auditLog('تغییر وضعیت پرونده', `${p.id}: از «${prev}» به «${next}»`)
    playChime('complete')
    showToast(`وضعیت پرونده به «${next}» به‌روزرسانی شد.`)
  }

  const handleDeletePerson = (p: Person) => {
    if (!window.confirm(`آیا از حذف پرونده «${p.firstName} ${p.lastName}» اطمینان دارید؟`)) return
    setPeople(cur => cur.filter(x => x.id !== p.id))
    auditLog('حذف پرونده', `${p.firstName} ${p.lastName} (${p.id})`)
    setSelected(null)
    playChime('alert')
    showToast('پرونده حذف شد.')
  }

  const handleEditPerson = (p: Person, changes: string[]) => {
    setPeople(cur => cur.map(x => (x.id === p.id ? p : x)))
    setSelected(p)
    setEditingPerson(null)
    const act: Activity = {
      id: uid('ACT'),
      personId: p.id,
      personName: `${p.firstName} ${p.lastName}`,
      action: 'ویرایش اطلاعات فرد',
      previousStatus: null,
      newStatus: null,
      rejectionReason: changes.join(' · '),
      createdAt: nowStamp(),
      createdBy: currentUser?.name ?? 'کاربر',
      createdByRole: currentUser?.role ?? 'admin',
      ts: nowTs(),
    }
    setActivities(cur => [act, ...cur])
    auditLog('ویرایش اطلاعات فرد', `${p.id}: ${changes.join('، ')}`)
    playChime('success')
    showToast('اطلاعات با موفقیت ذخیره شد.')
  }

  const handleAddNote = (personId: string, text: string, replyTo?: { author: string; text: string }) => {
    const note: Note = {
      id: uid('NOTE'),
      personId,
      author: currentUser?.name ?? 'کاربر',
      role: currentUser?.role ?? 'admin',
      title: currentUser?.title ?? 'کارشناس',
      text,
      createdAt: nowStamp(),
      replyTo,
    }
    setNotes(cur => [...cur, note])
    playChime('click')
  }

  const exportAllPeople = () => {
    downloadCsv(
      'all-people.csv',
      ['شناسه', 'نام', 'نام خانوادگی', 'کد ملی', 'تاریخ تولد', 'نام پدر', 'وضعیت', 'مهلت پیگیری', 'ارجاع به'],
      people.map(p => [
        p.id,
        p.firstName,
        p.lastName,
        p.nationalId,
        p.birthDate,
        p.fatherName,
        p.status,
        p.deadline ?? '',
        p.assignee ?? '',
      ]),
    )
    showToast('فایل اکسل با موفقیت دانلود شد.')
  }

  const exportActivities = () => {
    downloadCsv(
      'activities.csv',
      ['شناسه', 'پرونده', 'اقدام', 'وضعیت قبلی', 'وضعیت جدید', 'علت رد', 'ثبت‌کننده', 'تاریخ'],
      activities.map(a => [
        a.id,
        a.personName,
        a.action,
        a.previousStatus ?? '',
        a.newStatus ?? '',
        a.rejectionReason ?? '',
        a.createdBy,
        a.createdAt,
      ]),
    )
    showToast('فایل گزارش رویدادها دانلود شد.')
  }

  if (!authReady) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400" dir="rtl">در حال اتصال امن به هاست…</main>
  }

  if (setupOpen && needsSetup) {
    return <SetupAdmin onBack={() => setSetupOpen(false)} onSetup={async input => {
      const data = await setupAdminOnServer(input)
      applyServerBootstrap(data)
      playChime('success')
    }} />
  }

  if (!session || !currentUser) {
    return (
      <Login
        showSetup={needsSetup}
        serverMessage={serverMessage}
        onShowSetup={() => setSetupOpen(true)}
        onLogin={async (username, password, remember) => {
          const data = await loginOnServer(username, password, remember)
          applyServerBootstrap(data)
          playChime('success')
        }}
      />
    )
  }

  const navItems: [Page, string, Permission?][] = [
    ['dashboard', 'داشبورد'],
    ['persons', 'افراد و پرونده‌ها', 'view_persons'],
    ['workflow', 'گردش‌کار', 'view_persons'],
    ['activities', 'رویدادها', 'view_activities'],
    ['users', 'کاربران و دسترسی', 'manage_users'],
    ['reports', 'گزارش‌ها و تحلیل', 'view_reports'],
    ['settings', 'تنظیمات'],
  ]
  const mobileMorePageActive = navItems.slice(4).some(([key, , perm]) => key === page && (!perm || has(perm)))
  const compactNavLabels: Record<Page, string> = { dashboard: 'داشبورد', persons: 'افراد', workflow: 'گردش‌کار', activities: 'رویدادها', users: 'کاربران', reports: 'گزارش‌ها', settings: 'تنظیمات', tasks: 'کارها' }

  const todayJ = jalaliParts(new Date())
  const headerDate = `${todayJ.d} ${jalaliMonthNames[todayJ.m - 1]} ${todayJ.y}`
  const activityDayKeys = new Set(
    activities.map(a => {
      const p = a.createdAt.split(' · ')[0]?.split('/')
      return p && p.length === 3 ? `${p[0]}-${Number(p[1])}-${Number(p[2])}` : ''
    }),
  )

  const themeLabels: Record<ThemeMode, { label: string; dot: string }> = {
    light: { label: 'روشن (روز)', dot: '#f1f5f9' },
    dark: { label: 'تاریک (شب)', dot: '#0f172a' },
    midnight: { label: 'سرمه‌ای سلطنتی', dot: '#0b132b' },
    emerald: { label: 'زمردی سازمانی', dot: '#06281e' },
    cobalt: { label: 'آبی کاربنی', dot: '#0d1b2a' },
  }

  return (
    <div className={cn('min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100', theme !== 'light' && 'dark')} dir="rtl">
      <aside className={cn('fixed inset-y-0 right-0 z-40 hidden w-72 flex-col border-l border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 lg:flex dark:border-slate-800 dark:bg-slate-900', collapsed && 'w-20')}>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="absolute -left-4 top-8 -translate-x-full rounded-full px-2 text-xs"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'باز کردن نوار کناری' : 'جمع کردن نوار کناری'}
          aria-label={collapsed ? 'باز کردن نوار کناری' : 'جمع کردن نوار کناری'}
          aria-pressed={collapsed}
        >
          {collapsed ? 'باز کردن' : 'جمع کردن'}
        </Button>
        <div className="flex items-center gap-3 px-2 py-3">
          <b className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-lg font-black text-white shadow-sm">ن</b>
          <span className={cn('min-w-0', collapsed && 'hidden')}>
            <strong className="block text-sm font-bold text-slate-950 dark:text-white">ناب</strong>
            <small className="block truncate text-xs text-slate-500 dark:text-slate-400">مدیریت پرونده و کارها</small>
          </span>
        </div>
        <div className={cn('mb-2 mt-6 px-3 text-xs font-semibold text-slate-400', collapsed && 'sr-only')}>منوی اصلی</div>
        <nav className="flex-1 space-y-1">
          {navItems.map(([key, label, perm]) => {
            if (perm && !has(perm)) return null
            return (
              <Button
                type="button"
                key={key}
                variant="ghost"
                size="none"
                active={page === key}
                aria-current={page === key ? 'page' : undefined}
                className={cn('flex w-full justify-start rounded-xl px-3 py-2.5 text-right text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white', page === key && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300', collapsed && 'justify-center px-1 text-center text-[10px]')}
                onClick={() => {
                  setPage(key)
                  setCalOpen(false)
                  setMobileMoreOpen(false)
                }}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
              >
                <span>{collapsed ? compactNavLabels[key] : label}</span>
              </Button>
            )
          })}
        </nav>

        <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="none" className={cn('flex min-w-0 flex-1 justify-start gap-2 rounded-xl p-2 text-right', collapsed && 'justify-center')} onClick={() => setProfileOpen(true)} title={collapsed ? 'نمایش پروفایل' : undefined} aria-label={collapsed ? 'نمایش پروفایل' : `نمایش پروفایل ${currentUser.name}`}>
              <Avatar text={currentUser.name[0]} src={currentUser.photo} size={34} />
              <span className={collapsed ? 'hidden' : 'min-w-0'}>
                <b className="block truncate text-sm text-slate-800 dark:text-slate-100">{currentUser.name}</b>
                <small className="block truncate text-xs text-slate-500 dark:text-slate-400">{currentUser.title}</small>
              </span>
            </Button>
            <Button
              type="button"
              variant="dangerGhost"
              size="sm"
              className={cn('shrink-0', collapsed && 'hidden')}
              onClick={() => {
                setSession(null)
                playChime('alert')
              }}
              title="خروج از حساب"
              aria-label="خروج از حساب"
            >
              خروج
            </Button>
          </div>
        </div>
      </aside>

      <main className={cn('min-h-screen transition-[padding] duration-200 lg:pr-72', collapsed && 'lg:pr-20')}>
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-3 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-950/90">
          <div className="min-w-0 flex-1">
            <span>
              خانه / <b>{navItems.find(n => n[0] === page)?.[1]}</b>
            </span>
            <div className="relative hidden sm:block" data-app-popover="calendar">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="rounded-lg text-xs text-slate-500 dark:text-slate-400"
                onClick={() => {
                  setThemeMenuOpen(false)
                  setMobileMoreOpen(false)
                  setCalOpen(o => !o)
                }}
                title="نمایش تقویم شمسی"
                aria-expanded={calOpen}
                aria-label={`نمایش تقویم شمسی، ${headerDate}`}
              >
                <time>{headerDate}</time>
                <LiveClock />
              </Button>
              {calOpen && <MiniCalendar activityDays={activityDayKeys} onPick={() => setCalOpen(false)} />}
            </div>
            {isServerConnected !== null && (
              <span
                className="mr-2 hidden items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 sm:inline-flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                title={isServerConnected ? 'داده‌ها روی هاست ذخیره و همگام می‌شوند' : 'اتصال هاست برقرار نیست؛ ذخیره در مرورگر'}
              >
                {isServerConnected ? 'ذخیره در هاست فعال' : 'حالت محلی'}
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden min-w-0 max-w-sm flex-1 justify-start text-slate-500 md:flex dark:text-slate-400"
            onClick={() => {
              setCalOpen(false)
              setThemeMenuOpen(false)
              setMobileMoreOpen(false)
              setSearchOpen(true)
            }}
            title="پالت دستورات سریع و جستجو (Ctrl+K)"
            aria-label="جستجو و دستورات سریع"
          >
            جستجو یا دستور... <kbd>Ctrl+K</kbd>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => {
              setCalOpen(false)
              setThemeMenuOpen(false)
              setMobileMoreOpen(false)
              setSearchOpen(true)
            }}
            title="جستجو و دستورات سریع"
            aria-label="جستجو و دستورات سریع"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4 4" strokeLinecap="round" />
            </svg>
          </Button>

          <div className="flex items-center gap-2">
            {/* Theme Multi-Picker */}
            <div className="relative" data-app-popover="theme">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => {
                  setCalOpen(false)
                  setMobileMoreOpen(false)
                  setThemeMenuOpen(o => !o)
                }}
                title="انتخاب تم رنگی"
                aria-label="انتخاب تم رنگی"
                aria-expanded={themeMenuOpen}
                aria-controls="theme-menu"
              >
                انتخاب تم
              </Button>
              {themeMenuOpen && (
                <div id="theme-menu" role="group" aria-label="تم‌های رنگی" className="absolute left-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900" onClick={() => setThemeMenuOpen(false)}>
                  {(['light', 'dark', 'midnight', 'emerald', 'cobalt'] as ThemeMode[]).map(t => (
                    <Button
                      key={t}
                      type="button"
                      variant="ghost"
                      size="sm"
                      active={theme === t}
                      className={cn('w-full justify-start rounded-lg text-right', theme === t && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300')}
                      onClick={() => setTheme(t)}
                    >
                      <span>{themeLabels[t].label}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={openTasksPage}
              title="ورود به بخش کارهای من"
            >
              کارهای من
            </Button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          {legacySnapshot && (
            <LegacyDataMigration
              snapshot={legacySnapshot}
              canImport={legacyCanImport}
              onImport={handleLegacyImport}
              onDiscard={handleLegacyDiscard}
              onDownload={() => downloadLegacySnapshot(legacySnapshot)}
            />
          )}

          {page === 'dashboard' && (
            <Dashboard
              people={people}
              activities={activities}
              trend={{
                labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور'],
                values: [12, 19, 15, 27, 34, activities.length],
              }}
              canCreate={has('create_person')}
              onCreate={() => setCreateOpen(true)}
              onPersons={() => setPage('persons')}
              onSelect={setSelected}
              greeting={`خوش آمدید، ${currentUser.name}`}
            />
          )}

          {page === 'persons' && (
            <Persons
              people={people}
              query={query}
              filter={filter}
              tagFilter={tagFilter}
              sortBy={sortBy}
              setQuery={setQuery}
              setFilter={setFilter}
              setTagFilter={setTagFilter}
              setSortBy={setSortBy}
              canCreate={has('create_person')}
              canDelete={has('delete_person')}
              onCreate={() => setCreateOpen(true)}
              onSelect={setSelected}
              onBulkStatus={(ids, st) => {
                setPeople(cur => cur.map(p => (ids.includes(p.id) ? { ...p, status: st, updatedAt: nowStamp() } : p)))
                showToast(`وضعیت ${ids.length} پرونده تغییر یافت.`)
              }}
              onBulkDelete={ids => {
                if (!window.confirm(`حذف ${ids.length} پرونده انتخاب‌شده؟`)) return false
                setPeople(cur => cur.filter(p => !ids.includes(p.id)))
                showToast(`${ids.length} پرونده حذف شدند.`)
                return true
              }}
            />
          )}

          {page === 'workflow' && (
            <WorkflowBoard
              people={people}
              canChange={has('change_status')}
              onSelect={setSelected}
              onDropPerson={(id, st) => {
                const p = people.find(x => x.id === id)
                if (p) handleUpdateStatus(p, st, null)
              }}
            />
          )}

          {page === 'activities' && <Activities activities={activities} onExport={exportActivities} />}

          {page === 'users' && (
            <Users
              users={users}
              roles={roles}
              currentUser={currentUser}
              selfUsername={currentUser.username}
              onAdd={() => setAddUserOpen(true)}
              onEdit={setEditingUser}
              onDelete={async u => {
                if (u.username === currentUser.username) {
                  alert('نمی‌توانید حساب کاربری خود را حذف کنید.')
                  return
                }
                if (!window.confirm(`حذف کاربر «${u.name}»؟`)) return
                try {
                  await deleteUserOnServer(u.username)
                  setUsers(cur => cur.filter(x => x.username !== u.username))
                  showToast('کاربر حذف شد.')
                } catch (cause) {
                  showToast(cause instanceof Error ? cause.message : 'حذف کاربر ناموفق بود.')
                }
              }}
              onAddRole={() => setAddRoleOpen(true)}
              onDeleteRole={r => {
                if (window.confirm(`حذف نقش «${r.title}»؟`)) {
                  setRoles(cur => cur.filter(x => x.id !== r.id))
                  showToast('نقش حذف شد.')
                }
              }}
            />
          )}

          {page === 'reports' && (
            <Reports
              people={people}
              activities={activities}
              audit={audit}
              todayCount={activities.filter(a => a.createdAt.includes(todayJ.d.toString())).length}
              onExport={exportAllPeople}
              onPrint={() => window.print()}
            />
          )}

          {page === 'settings' && <Settings onSaved={() => showToast('تنظیمات با موفقیت ذخیره شد.')} />}
        </div>
      </main>

      {/* Modals */}
      {createOpen && (
        <CreateModal
          existing={people}
          creatorName={currentUser.name}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreatePerson}
        />
      )}

      {selected && (
        <PersonModal
          person={selected}
          notes={notes.filter(n => n.personId === selected.id)}
          history={activities.filter(a => a.personId === selected.id)}
          meName={currentUser.name}
          usersList={users}
          canChange={has('change_status')}
          canDelete={has('delete_person')}
          canEdit={has('edit_person')}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdateStatus}
          onDelete={handleDeletePerson}
          onEdit={p => {
            setEditingPerson(p)
            setSelected(null)
          }}
          onAssign={(p, uname) => {
            const up = { ...p, assignee: uname || undefined }
            setPeople(cur => cur.map(x => (x.id === p.id ? up : x)))
            setSelected(up)
            showToast('پرونده با موفقیت ارجاع داده شد.')
          }}
          onAddNote={handleAddNote}
          onEditNote={(id, txt) => setNotes(cur => cur.map(n => (n.id === id ? { ...n, text: txt, edited: true } : n)))}
          onDeleteNote={id => setNotes(cur => cur.filter(n => n.id !== id))}
        />
      )}

      {editingPerson && (
        <EditModal
          person={editingPerson}
          existing={people}
          onClose={() => setEditingPerson(null)}
          onSave={handleEditPerson}
        />
      )}

      {addUserOpen && (
        <AddUserModal
          existing={users}
          roles={roles}
          onClose={() => setAddUserOpen(false)}
          onCreate={async u => {
            const created = await createUserOnServer(u as unknown as Record<string, unknown>)
            setUsers(cur => [...cur, normalizeUser(created)])
            setAddUserOpen(false)
            showToast('کاربر جدید ایجاد شد.')
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          roles={roles}
          isSelf={editingUser.username === currentUser.username}
          onClose={() => setEditingUser(null)}
          onSave={async u => {
            const updated = await updateUserOnServer(u as unknown as Record<string, unknown>)
            setUsers(cur => cur.map(x => (x.username === u.username ? normalizeUser(updated) : x)))
            setEditingUser(null)
            showToast('دسترسی‌های کاربر به‌روز شد.')
          }}
        />
      )}

      {addRoleOpen && (
        <RoleModal
          existing={roles}
          onClose={() => setAddRoleOpen(false)}
          onCreate={r => {
            setRoles(cur => [...cur, r])
            setAddRoleOpen(false)
            showToast('نقش جدید تعریف شد.')
          }}
        />
      )}

      {profileOpen && (
        <ProfileModal
          user={currentUser}
          onClose={() => setProfileOpen(false)}
          onSave={async (name, photo, currentPassword, newPassword) => {
            const updated = await updateProfileOnServer({ name, photo: photo || null, current_password: currentPassword, new_password: newPassword })
            setUsers(cur => cur.map(x => (x.username === currentUser.username ? normalizeUser(updated) : x)))
            setProfileOpen(false)
            showToast('پروفایل به‌روزرسانی شد.')
          }}
          onLogout={handleLogout}
        />
      )}

      {searchOpen && (
        <SearchModal
          people={people}
          activities={activities}
          notes={notes}
          onClose={() => setSearchOpen(false)}
          onPickPerson={p => {
            setSelected(p)
            setSearchOpen(false)
          }}
          onNavigate={p => {
            setPage(p)
            setSearchOpen(false)
          }}
          onOpenCreatePerson={() => setCreateOpen(true)}
          onOpenCreateTask={openTasksPage}
          onChangeTheme={t => setTheme(t)}
          onExportData={exportAllPeople}
        />
      )}

      {/* Printable Views */}
      {selected && (
        <PrintPerson
          person={selected}
          notes={notes.filter(n => n.personId === selected.id)}
          history={activities.filter(a => a.personId === selected.id)}
        />
      )}

      {page === 'reports' && (
        <PrintReport people={people} activities={activities} printedBy={currentUser.name} />
      )}

      <nav aria-label="پیمایش موبایل" className="fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-stretch gap-1 border-t border-slate-200 bg-white/95 px-1.5 py-1.5 pb-[max(.375rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {navItems.slice(0, 4).map(([key, label, perm]) => !perm || has(perm) ? (
          <Button
            key={key}
            type="button"
            variant="tab"
            size="none"
            active={page === key}
            aria-current={page === key ? 'page' : undefined}
            onClick={() => {
              setPage(key)
              setCalOpen(false)
              setThemeMenuOpen(false)
              setMobileMoreOpen(false)
            }}
            className={cn('flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[10px] text-slate-500 dark:text-slate-400', page === key && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300')}
          >
            <span className="truncate">{label}</span>
          </Button>
        ) : null)}
        <div className="relative flex min-w-0 flex-1" data-app-popover="mobile-more">
          <Button
            type="button"
            variant="tab"
            size="none"
            active={mobileMoreOpen || mobileMorePageActive}
            aria-current={mobileMorePageActive ? 'page' : undefined}
            aria-expanded={mobileMoreOpen}
            aria-controls="mobile-more-menu"
            onClick={() => setMobileMoreOpen(open => !open)}
            className={cn('flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[10px] text-slate-500 dark:text-slate-400', mobileMoreOpen && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300')}
          >
            <span>بیشتر</span>
          </Button>
          {mobileMoreOpen && (
            <div id="mobile-more-menu" className="absolute bottom-full left-0 z-50 mb-2 grid max-h-[70vh] w-[min(19rem,calc(100vw-1rem))] grid-cols-1 gap-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              {navItems.slice(4).map(([key, label, perm]) => !perm || has(perm) ? (
                <Button
                  key={key}
                  type="button"
                  variant={page === key ? 'soft' : 'ghost'}
                  size="sm"
                  active={page === key}
                  aria-current={page === key ? 'page' : undefined}
                  className="w-full justify-start"
                  onClick={() => {
                    setPage(key)
                    setCalOpen(false)
                    setThemeMenuOpen(false)
                    setMobileMoreOpen(false)
                  }}
                >
                  {label}
                </Button>
              ) : null)}
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={openTasksPage}>
                کارهای من
              </Button>
            </div>
          )}
        </div>
      </nav>
      {toast && <div className="fixed bottom-20 left-4 z-[60] max-w-sm rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl lg:bottom-6">{toast}</div>}
    </div>
  )
}
