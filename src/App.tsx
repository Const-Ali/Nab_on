import { useEffect, useMemo, useRef, useState } from 'react'
import { jalaliMonthNames, jalaliParts, load, normalizeText, nowStamp, nowTs, save, uid } from './shared'
import { Avatar, Icon, MiniCalendar } from './shared-ui'
import { workflow, nextStatuses, deadlineLeft, initialPeople, initialActivities, initialAudit, initialUsers, initialNotes, defaultRoles, userByRole, defaultSettings, normalizeUser, activityMonth, downloadCsv, applySavedFont } from './app-lib'
import type { Status, Page, Permission, Role, RoleDef, Person, Activity, Audit, User, Note } from './types'
import { Login } from './components/pages/Login'
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
import { ProfileModal } from './components/modals/ProfileModal'
import { SearchModal } from './components/modals/SearchModal'
import { PrintPerson } from './components/common/PrintPerson'
import { Skeleton } from './components/common/Skeleton'
import { PrintReport } from './components/common/PrintReport'
import WorkManagementPage from './tasks/WorkManagementPage'
import './App.css'

export default function App() {
  const [session, setSession] = useState<{ username: string } | null>(() => {
    const raw = load<{ username?: string; role?: Role } | null>('nab:session', null)
    if (!raw) return null
    if (raw.username) return { username: raw.username }
    const legacy: Record<string, string> = { admin: 'admin', assistant: 'assistant', reviewer: 'reviewer' }
    return raw.role && legacy[raw.role] ? { username: legacy[raw.role] } : null
  })
  const [page, setPage] = useState<Page>('dashboard')
  const [people, setPeople] = useState<Person[]>(() => load('nab:people', initialPeople))
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Status | 'همه وضعیت‌ها' | 'سررسید نزدیک'>('همه وضعیت‌ها')
  const [tagFilter, setTagFilter] = useState('همه برچسب‌ها')
  const [sortBy, setSortBy] = useState('default')
  const [selected, setSelected] = useState<Person | null>(null)
  const [editing, setEditing] = useState<Person | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userEditing, setUserEditing] = useState<User | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifPermission, setNotifPermission] = useState<string>(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => load('nab:collapsed', false))
  const [searchOpen, setSearchOpen] = useState(false)
  const [reportPrint, setReportPrint] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => load('nab:theme', 'light'))
  const [booting, setBooting] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)
  const idleTimer = useRef<number | undefined>(undefined)
  const prevEventTs = useRef(0)

  const [activities, setActivities] = useState<Activity[]>(() => load('nab:activities', initialActivities))
  const [audit, setAudit] = useState<Audit[]>(() => load('nab:audit', initialAudit))
  const [users, setUsers] = useState<User[]>(() => load<User[]>('nab:users', initialUsers).map(normalizeUser))
  const [roles, setRoles] = useState<RoleDef[]>(() => load('nab:roles', defaultRoles))
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [notes, setNotes] = useState<Note[]>(() => load('nab:notes', initialNotes))
  const [lastSeen, setLastSeen] = useState<Record<string, number>>(() => load('nab:lastseen', {}))

  useEffect(() => save('nab:people', people), [people])
  useEffect(() => save('nab:activities', activities), [activities])
  useEffect(() => save('nab:audit', audit), [audit])
  useEffect(() => save('nab:users', users), [users])
  useEffect(() => save('nab:roles', roles), [roles])
  useEffect(() => save('nab:notes', notes), [notes])
  useEffect(() => save('nab:lastseen', lastSeen), [lastSeen])
  useEffect(() => { document.documentElement.dataset.theme = theme; save('nab:theme', theme) }, [theme])
  useEffect(() => applySavedFont(), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    if (!reportPrint) return
    const t = window.setTimeout(() => { window.print(); setReportPrint(false) }, 60)
    return () => window.clearTimeout(t)
  }, [reportPrint])
  useEffect(() => {
    if (!booting) return
    const t = window.setTimeout(() => setBooting(false), 700)
    return () => window.clearTimeout(t)
  }, [booting])
  useEffect(() => {
    if (!session?.username) return
    const autoLogout = { ...defaultSettings, ...load('nab:settings', defaultSettings) }.autoLogout
    const mins = { ...defaultSettings, ...load('nab:settings', defaultSettings) }.autoLogoutMins
    if (!autoLogout) return
    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
    const reset = () => {
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(() => {
        setSession(null)
        setPage('dashboard')
        localStorage.removeItem('nab:session')
        setToast({ msg: 'به دلیل عدم فعالیت از سامانه خارج شدید' })
      }, mins * 60 * 1000)
    }
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => { events.forEach(e => window.removeEventListener(e, reset)); window.clearTimeout(idleTimer.current) }
  }, [session?.username])

  const currentUser = session ? users.find(u => u.username === session.username) ?? null : null
  const role: Role = currentUser?.role ?? 'admin'
  const meName = currentUser?.name ?? userByRole[role].name
  const me = { name: meName, title: currentUser?.title ?? roles.find(r => r.id === role)?.title ?? role }
  const can = (permission: Permission) => (currentUser?.permissions ?? roles.find(r => r.id === role)?.permissions ?? []).includes(permission)
  const today = new Date().toLocaleDateString('fa-IR')
  const todayActivities = useMemo(() => activities.filter(a => a.createdAt.startsWith(today)), [activities, today])
  const seenAt = lastSeen[role] ?? 0
  const unread = activities.filter(a => a.ts !== undefined && a.ts > seenAt && a.createdBy !== meName)
  const unreadIds = new Set(unread.map(a => a.id))
  const mentionNames = users.map(u => u.name)
  const activityDayKeys = new Set(activities.filter(a => a.ts).map(a => { const j = jalaliParts(new Date(a.ts as number)); return `${j.y}-${j.m}-${j.d}` }))
  const trend = useMemo(() => {
    const todayJ = jalaliParts(new Date())
    const base = todayJ.y * 12 + (todayJ.m - 1)
    const months = Array.from({ length: 6 }, (_, i) => { const idx = base - 5 + i; return { y: Math.floor(idx / 12), m: (idx % 12) + 1 } })
    const labels = months.map(({ m }) => jalaliMonthNames[m - 1])
    const values = months.map(({ y, m }) => activities.filter(a => { const am = activityMonth(a); return am && am.y === y && am.m === m }).length)
    return { labels, values }
  }, [activities])
  const enableBrowserNotif = async () => { if ('Notification' in window) setNotifPermission(await Notification.requestPermission()) }
  useEffect(() => {
    const othersLatest = activities.filter(a => a.ts && a.createdBy !== meName).reduce((m, a) => Math.max(m, a.ts ?? 0), 0)
    if (othersLatest > prevEventTs.current && prevEventTs.current !== 0 && notifPermission === 'granted' && Date.now() - othersLatest < 15000) {
      const fresh = activities.find(a => a.ts === othersLatest)
      if (fresh) new Notification('رویداد جدید در سامانه ناب', { body: `${fresh.action} · ${fresh.personName}` })
    }
    prevEventTs.current = othersLatest
  }, [activities, meName, notifPermission])
  const markAllRead = () => setLastSeen(cur => ({ ...cur, [role]: Date.now() }))
  const toggleNotifs = () => { if (notifOpen) markAllRead(); setNotifOpen(open => !open) }
  const filtered = useMemo(() => {
    const q = normalizeText(query)
    const list = people.filter(p => (!q || normalizeText(`${p.firstName} ${p.lastName} ${p.nationalId}`).includes(q)) && (filter === 'سررسید نزدیک' ? (deadlineLeft(p) ?? 99) <= 7 : filter === "همه وضعیت‌ها" || p.status === filter) && (tagFilter === 'همه برچسب‌ها' || (p.tags ?? []).includes(tagFilter)))
    const sorted = [...list]
    if (sortBy === 'name') sorted.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fa'))
    else if (sortBy === 'status') sorted.sort((a, b) => workflow.indexOf(a.status) - workflow.indexOf(b.status))
    else if (sortBy === 'recent') sorted.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
    return sorted
  }, [people, query, filter, tagFilter, sortBy, session])

  const notify = (message: string, undo?: () => void) => {
    setToast({ msg: message, undo })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 6000 : 2400)
  }
  const logAudit = (action: string, target: string, actor?: string) =>
    setAudit(cur => [{ id: uid('AUD'), action, target, createdAt: nowStamp(), createdBy: actor ?? me.name }, ...cur])

  const handleLogin = (user: User, remember: boolean) => {
    setSession({ username: user.username })
    setBooting(true)
    const nearCount = people.filter(p => { const l = deadlineLeft(p); return l !== null && l <= 3 }).length
    if (nearCount) window.setTimeout(() => notify(`${nearCount.toLocaleString('fa-IR')} پرونده به سررسید نزدیک یا گذشته‌اند — از فیلتر «سررسید نزدیک» ببینید`), 900)
    if (remember) save('nab:session', { username: user.username })
    else localStorage.removeItem('nab:session')
    logAudit('ورود به سامانه', user.title, user.name)
  }
  const handleLogout = () => {
    logAudit('خروج از سامانه', me.title)
    setSession(null)
    setPage('dashboard')
    localStorage.removeItem('nab:session')
  }

  const updateStatus = (person: Person, next: Status, reason: string | null) => {
    const now = nowStamp()
    const tsNow = nowTs()
    setPeople(cur => cur.map(p => p.id === person.id ? { ...p, status: next, updatedAt: now, updatedBy: me.name, ts: tsNow } : p))
    setActivities(cur => [{ id: uid('ACT'), personId: person.id, personName: `${person.firstName} ${person.lastName}`, action: next === 'رد شده' ? 'رد پرونده' : 'تغییر وضعیت پرونده', previousStatus: person.status, newStatus: next, rejectionReason: reason, createdAt: now, createdBy: me.name, createdByRole: role, ts: Date.now() }, ...cur])
    logAudit(next === 'رد شده' ? 'رد پرونده' : 'تغییر وضعیت پرونده', `${person.firstName} ${person.lastName}`)
    setSelected(null)
    notify('وضعیت و تاریخچه پرونده ثبت شد', () => {
      setPeople(cur => cur.map(p => p.id === person.id ? { ...p, status: person.status, ts: person.ts } : p))
      logAudit('بازگردانی تغییر وضعیت', `${person.firstName} ${person.lastName} → ${person.status}`)
    })
  }
  const createPerson = (p: Person) => {
    setPeople(cur => [{ ...p, ts: Date.now() }, ...cur])
    setActivities(cur => [{ id: uid('ACT'), personId: p.id, personName: `${p.firstName} ${p.lastName}`, action: 'ایجاد پرونده جدید', previousStatus: null, newStatus: p.status, rejectionReason: null, createdAt: nowStamp(), createdBy: me.name, createdByRole: role, ts: Date.now() }, ...cur])
    logAudit('ایجاد فرد', `${p.firstName} ${p.lastName}`)
    setCreateOpen(false)
    notify('فرد جدید با موفقیت ثبت شد')
  }
  const updatePerson = (updated: Person, changedFields: string[]) => {
    const now = nowStamp()
    const fresh = { ...updated, updatedAt: now, updatedBy: me.name, ts: nowTs() }
    setPeople(cur => cur.map(p => p.id === fresh.id ? fresh : p))
    setActivities(cur => [{ id: uid('ACT'), personId: fresh.id, personName: `${fresh.firstName} ${fresh.lastName}`, action: 'ویرایش اطلاعات فرد', previousStatus: null, newStatus: fresh.status, rejectionReason: changedFields.join('، '), createdAt: now, createdBy: me.name, createdByRole: role, ts: Date.now() }, ...cur])
    logAudit('ویرایش اطلاعات فرد', `${fresh.firstName} ${fresh.lastName} (${changedFields.join('، ')})`)
    setEditing(null)
    setSelected(fresh)
    notify('اطلاعات فرد به‌روزرسانی شد')
  }
  const addNote = (personId: string, text: string, replyTo?: { author: string; text: string }) => {
    const person = people.find(p => p.id === personId)
    setNotes(cur => [...cur, { id: uid('NOTE'), personId, author: me.name, role, title: me.title, text, createdAt: nowStamp(), replyTo, mentions: mentionNames.filter(n => text.includes(`@${n}`)) }])
    if (person) setActivities(cur => [{ id: uid('ACT'), personId, personName: `${person.firstName} ${person.lastName}`, action: 'ثبت یادداشت', previousStatus: null, newStatus: person.status, rejectionReason: text.length > 60 ? `${text.slice(0, 60)}…` : text, createdAt: nowStamp(), createdBy: me.name, createdByRole: role, ts: Date.now() }, ...cur])
    notify('یادداشت شما ثبت شد')
  }
  const updateNote = (noteId: string, text: string) => {
    setNotes(cur => cur.map(n => n.id === noteId ? { ...n, text, edited: true } : n))
    notify('یادداشت ویرایش شد')
  }
  const deleteNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note || !window.confirm('این یادداشت حذف شود؟')) return
    setNotes(cur => cur.filter(n => n.id !== noteId))
    const person = people.find(p => p.id === note.personId)
    logAudit('حذف یادداشت', person ? `${person.firstName} ${person.lastName}` : note.personId)
    notify('یادداشت حذف شد')
  }
  const saveProfile = (name: string, photo: string, newPassword: string) => {
    setUsers(cur => cur.map(u => u.username === session?.username ? { ...u, name, photo: photo || undefined, password: newPassword || u.password } : u))
    logAudit('ویرایش پروفایل', name)
    setProfileOpen(false)
    notify('پروفایل ذخیره شد')
  }
  const dropPerson = (personId: string, target: Status) => {
    const person = people.find(p => p.id === personId)
    if (!person || person.status === target) return
    const allowed = nextStatuses[person.status] ?? []
    if (target === 'رد شده' && allowed.includes('رد شده')) { setSelected(person); notify('برای رد پرونده، علت رد را در فرم وارد کنید'); return }
    if (!allowed.includes(target)) { notify(`انتقال از «${person.status}» به «${target}» مجاز نیست`); return }
    updateStatus(person, 'در حال تغییر وضعیت' as Status, null)
  }
  const assignPerson = (person: Person, username: string) => {
    const assignee = username || undefined
    setPeople(cur => cur.map(p => (p.id === person.id ? { ...p, assignee } : p)))
    setSelected(cur => (cur && cur.id === person.id ? { ...cur, assignee } : cur))
    setPeople(cur => cur.map(p => (p.id === person.id ? { ...p, assignee } : p)))
    setSelected(cur => (cur && cur.id === person.id ? { ...cur, assignee } : cur))
  }
  const addRole = (r: RoleDef) => {
    setRoles(cur => [...cur, r])
    setRoleModalOpen(false)
    logAudit('ایجاد نقش', r.title)
    notify(`نقش «${r.title}» ایجاد شد`)
  }
  const deleteRole = (r: RoleDef) => {
    if (r.builtin) return
    if (users.some(u => u.role === r.id)) { notify('این نقش به کاربری تخصیص داده شده و قابل حذف نیست'); return }
    if (!window.confirm(`نقش «${r.title}» حذف شود؟`)) return
    setRoles(cur => cur.filter(x => x.id !== r.id))
    logAudit('حذف نقش', r.title)
    notify('نقش حذف شد')
  }
  const bulkStatus = (ids: string[], target: Status) => {
    let moved = 0
    ids.forEach(id => {
      const person = people.find(p => p.id === id)
      if (person && (nextStatuses[person.status] ?? []).includes(target)) { updateStatus(person, 'در حال تغییر وضعیت' as Status, null); moved++ }
    })
    if (moved) notify(`${moved.toLocaleString('fa-IR')} پرونده به مرحله «${target}» منتقل شد${ids.length - moved ? ` (${(ids.length - moved).toLocaleString('fa-IR')} پرونده در این مرحله مجاز نبود)` : ''}`)
    else notify('هیچ‌کدام از پرونده‌های انتخابی قابل انتقال به این مرحله نیستند')
  }
  const bulkDelete = (ids: string[]) => {
    if (!window.confirm(`${ids.length.toLocaleString('fa-IR')} پرونده حذف شود؟ تا چند ثانیه قابل بازگردانی است.`)) return
    const backupPeople = people.filter(p => ids.includes(p.id))
    const backupNotes = notes.filter(n => ids.includes(n.personId))
    setPeople(cur => cur.filter(p => !ids.includes(p.id)))
    setNotes(cur => cur.filter(n => !ids.includes(n.personId)))
    logAudit('حذف گروهی', `${ids.length.toLocaleString('fa-IR')} پرونده`)
    notify('پرونده‌های انتخاب‌شده حذف شدند', () => {
      setPeople(cur => [...backupPeople, ...cur])
      setNotes(cur => [...cur, ...backupNotes])
    })
  }
  const deletePerson = (person: Person) => {
    if (!window.confirm(`پرونده «${person.firstName} ${person.lastName}» حذف شود؟ تا چند ثانیه قابل بازگردانی است.`)) return
    const backupNotes = notes.filter(n => n.personId === person.id)
    setPeople(cur => cur.filter(p => p.id !== person.id))
    setNotes(cur => cur.filter(n => n.personId !== person.id))
    logAudit('حذف پرونده', `${person.firstName} ${person.lastName}`)
    setSelected(null)
    notify('پرونده حذف شد', () => {
      setPeople(cur => [person, ...cur])
      setNotes(cur => [...cur, ...backupNotes])
    })
  }
  const addUser = (user: User) => {
    setUsers(cur => [...cur, user])
    logAudit('ایجاد کاربر', `${user.name} (${user.username})`)
    setUserModalOpen(false)
    notify('کاربر جدید ایجاد شد')
  }
  const deleteUser = (user: User) => {
    if (user.username === session?.username) { notify('نمی‌توانید کاربر فعلی را حذف کنید'); return }
    if (user.role === 'admin' && users.filter(u => u.role === 'admin' && u.active).length <= 1) { notify('حداقل یک مدیر فعال باید باقی بماند'); return }
    if (!window.confirm(`کاربر «${user.name}» حذف شود؟`)) return
    setUsers(cur => cur.filter(u => u.username !== user.username))
    logAudit('حذف کاربر', `${user.name} (${user.username})`)
    notify('کاربر حذف شد')
  }
  const updateUserAccess = (updated: User, changes: string[]) => {
    const previous = users.find(u => u.username === updated.username)
    if (!previous) return
    const activeAdmins = users.filter(u => u.role === 'admin' && u.active)
    if (previous.role === 'admin' && (updated.role !== 'admin' || !updated.active) && activeAdmins.length <= 1) { notify('حداقل یک مدیر فعال باید باقی بماند'); return }
    if (updated.username === session?.username && !updated.active) { notify('نمی‌توانید حساب خودتان را غیرفعال کنید'); return }
    setUsers(cur => cur.map(u => u.username === updated.username ? updated : u))
    logAudit('ویرایش دسترسی کاربر', `${updated.name} (${changes.join('، ')})`)
    setUserEditing(null)
    notify('دسترسی کاربر به‌روزرسانی شد')
  }

  if (!session || !currentUser) return <Login users={users} onLogin={handleLogin} />

  const nav: [Page, string, string][] = [['dashboard', 'داشبورد', 'grid'], ['persons', 'مدیریت افراد', 'users'], ['workflow', 'گردش‌کار پرونده', 'workflow'], ['activities', 'گزارش فعالیت‌ها', 'activity'], ['users', 'کاربران و دسترسی‌ها', 'shield'], ['reports', 'گزارش‌ها و Audit Log', 'activity'], ['settings', 'تنظیمات', 'settings']]
  const visibleNav = nav.filter(([id]) => id === 'dashboard' || id === 'persons' || (id === 'workflow' && can('change_status')) || (id === 'activities' && can('view_activities')) || (id === 'users' && can('manage_users')) || (id === 'reports' && can('view_reports')) || id === 'settings')
  const headerDate = new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // «کارهای من» یک صفحه‌ی کاملاً جداگانه است — بدون سایدبار و بدون هدر اصلی سامانه
  if (page === 'tasks') {
    return (
      <div className="min-h-screen bg-[#f5f7fb] text-ink dark:bg-[#0c1120] dark:text-[#dfe5f2]" dir="rtl">
        <div className="sticky top-0 z-[4] border-b border-line bg-white dark:border-[#232c45] dark:bg-[#151d30]">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-[10px] px-[16px] py-[11px]">
            <div className="flex items-center gap-[10px]">
              <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-gradient-to-br from-[#6f82ff] to-[#4357dd] text-[19px] font-extrabold text-white">ن</span>
              <span>
                <b className="block text-[13px] text-ink dark:text-[#eef2fb]">کارهای من</b>
                <small className="mt-[2px] block text-[9px] text-faint">{me.name} — فضای خصوصی کارها</small>
              </span>
            </div>
            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-line2 bg-white text-[#8994a8] hover:text-pri dark:border-dkline2 dark:bg-dksurf dark:text-[#c6cede]"
                onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
                title={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
                aria-label="تغییر تم"
              >
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[17px] w-[17px]" />
              </button>
              <button
                type="button"
                className="flex items-center gap-[7px] rounded-[9px] bg-pri px-[14px] py-[9px] text-[10.5px] font-semibold text-white shadow-[0_7px_16px_rgba(82,103,245,.2)]"
                onClick={() => setPage('dashboard')}
              >
                بازگشت به سامانه ناب →
              </button>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1180px] px-[16px] py-[24px]">
          <WorkManagementPage users={users} sessionUsername={session.username} sessionName={me.name} />
        </div>
      </div>
    )
  }

  return (
    <div className={`app ${collapsed ? 'collapsed' : ''}`} dir="rtl">
      <aside className="sidebar">
        <div className="brand"><b>ن</b><span><strong>ناب</strong><small>سامانه مدیریت پرونده</small></span></div>
        <button type="button" className={`collapse-btn ${collapsed ? 'flip' : ''}`} title={collapsed ? 'باز کردن منو' : 'جمع کردن منو'} onClick={() => setCollapsed(c => { save('nab:collapsed', !c); return !c })}>«</button>
        <small className="menu-title">منوی اصلی</small>
        {visibleNav.map(([id, label, icon]) => (
          <button className={`nav ${page === id ? 'active' : ''}`} key={id} onClick={() => { setPage(id); if (id === 'activities') markAllRead() }}>
            <Icon name={icon} /><span>{label}</span>
            {id === 'activities' && unread.length > 0 && <em>{unread.length.toLocaleString('fa-IR')}</em>}
          </button>
        ))}
        <div className="side-bottom">
          <div className="help">؟<span>نیاز به راهنمایی دارید؟<small>راهنمای سامانه را ببینید</small></span></div>
          <div className="profile-row">
            <button className="profile" onClick={() => setProfileOpen(true)}><Avatar text={me.name[0]} tone="green" src={currentUser?.photo} /><span><b>{me.name}</b><small>{me.title} · پروفایل</small></span></button>
            <button className="exit-btn" title="خروج از حساب" onClick={handleLogout}><Icon name="logout" /></button>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="crumb">
            <span>خانه / <b>{nav.find(item => item[0] === page)?.[1]}</b></span>
            <div className="cal-wrap">
              <button type="button" className="date-btn" onClick={() => setCalOpen(open => !open)} title="نمایش تقویم شمسی">
                <time>{headerDate}</time>
                <LiveClock />
              </button>
              {calOpen && <MiniCalendar activityDays={activityDayKeys} />}
            </div>
          </div>
          <button type="button" className="search-hint" onClick={() => setSearchOpen(true)} title="جستجوی سراسری (Ctrl+K)"><Icon name="search" /> جستجو... <kbd>Ctrl+K</kbd></button>
          <button
            type="button"
            className="flex items-center gap-[7px] rounded-[9px] bg-pri px-[13px] py-[8px] text-[10px] font-semibold text-white shadow-[0_7px_16px_rgba(82,103,245,.18)]"
            onClick={() => setPage('tasks')}
            title="ورود به صفحه‌ی جداگانه‌ی کارهای من"
          >
            <Icon name="task" className="h-[15px] w-[15px]" />
            کارهای من
          </button>
          <div className="head-user">
            <button type="button" className="theme-btn" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} title={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'} aria-label="تغییر تم">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <div className="notif-wrap">
              <button className="bell-btn" onClick={toggleNotifs} aria-label="اعلان‌ها">
                <Icon name="bell" />
                {unread.length > 0 && <span className="badge-count">{unread.length.toLocaleString('fa-IR')}</span>}
              </button>
              {notifOpen && (
                <div className="notif-pop">
                  <div className="notif-head"><h4>آخرین رویدادها</h4>{unread.length > 0 && <em>{unread.length.toLocaleString('fa-IR')} خوانده‌نشده</em>}{notifPermission === 'default' && <button type="button" className="notif-enable" onClick={() => void enableBrowserNotif()}>🔔 اعلان مرورگر</button>}</div>
                  {activities.slice(0, 6).map(a => (
                    <div className={`notif-item ${unreadIds.has(a.id) ? 'unread' : ''}`} key={a.id}>
                      <b>{a.action}{a.rejectionReason?.includes(`@${meName}`) && <em className="mention-tag">منشن شما</em>}</b>
                      <small>{a.personName} · {a.createdBy}<br />{a.createdAt}</small>
                    </div>
                  ))}
                  {!activities.length && <div className="notif-empty">رویدادی ثبت نشده است</div>}
                </div>
              )}
            </div>
            <Avatar text={me.name[0]} tone="green" src={currentUser?.photo} />
            <span><b>{me.name}</b><small>{me.title}</small></span>
          </div>
        </header>
        <div className="content">
          {booting && <Skeleton />}
          {!booting && page === 'dashboard' && <Dashboard people={people} activities={activities} trend={trend} canCreate={can('create_person')} onCreate={() => setCreateOpen(true)} onPersons={() => setPage('persons')} onSelect={setSelected} greeting={`صبح بخیر، ${me.name.split(' ')[0]} 👋`} />}
          {!booting && page === 'persons' && <Persons people={filtered} query={query} filter={filter} tagFilter={tagFilter} sortBy={sortBy} setQuery={setQuery} setFilter={setFilter} setTagFilter={setTagFilter} setSortBy={setSortBy} canCreate={can('create_person')} canDelete={can('delete_person')} onCreate={() => setCreateOpen(true)} onSelect={setSelected} onBulkStatus={bulkStatus} onBulkDelete={bulkDelete} />}
          {!booting && page === 'workflow' && <WorkflowBoard people={people} canChange={can('change_status')} onSelect={setSelected} onDropPerson={dropPerson} />}
          {!booting && page === 'activities' && <Activities activities={activities} onExport={() => { downloadCsv('activities.csv', ['شناسه', 'فرد', 'اقدام', 'وضعیت قبلی', 'وضعیت جدید', 'علت رد', 'زمان', 'کاربر'], activities.map(a => [a.id, a.personName, a.action, a.previousStatus, a.newStatus, a.rejectionReason, a.createdAt, a.createdBy])); notify('خروجی اکسل دانلود شد') }} />}
          {!booting && page === 'users' && <Users users={users} roles={roles} currentUser={currentUser} selfUsername={session.username} onAdd={() => setUserModalOpen(true)} onEdit={u => setUserEditing(u)} onDelete={deleteUser} onAddRole={() => setRoleModalOpen(true)} onDeleteRole={deleteRole} />}
          {!booting && page === 'reports' && <Reports people={people} activities={activities} audit={audit} todayCount={todayActivities.length} onExport={() => { downloadCsv('audit-log.csv', ['شناسه', 'اقدام', 'هدف', 'زمان', 'کاربر'], audit.map(a => [a.id, a.action, a.target, a.createdAt, a.createdBy])); notify('خروجی گزارش دانلود شد') }} onPrint={() => setReportPrint(true)} />}
          {!booting && page === 'settings' && <Settings onSaved={() => { logAudit('ویرایش تنظیمات', 'تنظیمات سامانه'); notify('تنظیمات ذخیره شد'); applySavedFont() }} />}
        </div>
      </main>
      {selected && !editing && <PersonModal person={selected} notes={notes.filter(n => n.personId === selected.id)} history={activities.filter(a => a.personId === selected.id)} meName={me.name} usersList={users} onAssign={assignPerson} onEditNote={updateNote} onDeleteNote={deleteNote} canChange={can('change_status')} canDelete={can('delete_person')} canEdit={can('edit_person')} onClose={() => setSelected(null)} onUpdate={updateStatus} onDelete={deletePerson} onEdit={p => setEditing(p)} onAddNote={addNote} />}
      {reportPrint && <PrintReport people={people} activities={activities} printedBy={meName} />}
      {selected && !editing && <PrintPerson person={selected} notes={notes.filter(n => n.personId === selected.id)} history={activities.filter(a => a.personId === selected.id)} />}
      {editing && <EditModal person={editing} existing={people} onClose={() => setEditing(null)} onSave={updatePerson} />}
      {createOpen && can('create_person') && <CreateModal existing={people} creatorName={me.name} onClose={() => setCreateOpen(false)} onCreate={createPerson} />}
      {userModalOpen && <AddUserModal existing={users} roles={roles} onClose={() => setUserModalOpen(false)} onCreate={addUser} />}
      {roleModalOpen && <RoleModal existing={roles} onClose={() => setRoleModalOpen(false)} onCreate={addRole} />}
      {userEditing && <EditUserModal user={userEditing} roles={roles} isSelf={session.username === userEditing.username} onClose={() => setUserEditing(null)} onSave={updateUserAccess} />}
      {profileOpen && currentUser && <ProfileModal user={currentUser} onClose={() => setProfileOpen(false)} onSave={saveProfile} onLogout={handleLogout} />}
      {searchOpen && <SearchModal people={people} activities={activities} notes={notes} onClose={() => setSearchOpen(false)} onPickPerson={p => { setSearchOpen(false); setPage('persons'); setSelected(p) }} />}
      {toast && <div className="toast">✓ {toast.msg}{toast.undo && <button type="button" className="toast-undo" onClick={() => { toast.undo?.(); window.clearTimeout(toastTimer.current); setToast(null) }}>بازگردانی</button>}</div>}
    </div>
  )
}
