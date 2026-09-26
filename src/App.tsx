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
  checkServerHealth,
  fetchAllFromServer,
  syncSave,
} from './api-client'
import { Avatar, Icon, MiniCalendar } from './shared-ui'
import {
  deadlineLeft,
  initialPeople,
  initialActivities,
  initialAudit,
  initialUsers,
  initialNotes,
  defaultRoles,
  normalizeUser,
  downloadCsv,
  applySavedFont,
} from './app-lib'
import type {
  Status,
  Page,
  Permission,
  Role,
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
import { PrintReport } from './components/common/PrintReport'
import { btnPrimary, cn, focusRing, transition } from './components/ui'

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
  const [filter, setFilter] = useState<PersonFilter>('همه وضعیت‌ها')
  const [tagFilter, setTagFilter] = useState('همه برچسب‌ها')
  const [sortBy, setSortBy] = useState('default')
  const [selected, setSelected] = useState<Person | null>(null)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>(() => load('nab:activities', initialActivities))
  const [audit, setAudit] = useState<Audit[]>(() => load('nab:audit', initialAudit))
  const [users, setUsers] = useState<User[]>(() => load<unknown[]>('nab:users', initialUsers).map(normalizeUser))
  const [roles, setRoles] = useState<RoleDef[]>(() => load('nab:roles', defaultRoles))
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [addRoleOpen, setAddRoleOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [notes, setNotes] = useState<Note[]>(() => load('nab:notes', initialNotes))
  const [toast, setToast] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(() => load('nab:sidebar-collapsed', false))
  const [theme, setTheme] = useState<ThemeMode>(() => load<ThemeMode>('nab:theme', 'light'))
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [isServerConnected, setIsServerConnected] = useState<boolean | null>(null)

  // بارگذاری اولیه و همگام‌سازی با دیتابیس هاست
  useEffect(() => {
    async function initServerSync() {
      const healthy = await checkServerHealth()
      setIsServerConnected(healthy)
      if (healthy) {
        const serverData = await fetchAllFromServer()
        if (serverData) {
          if (Array.isArray(serverData['nab:people']) && serverData['nab:people'].length > 0) {
            setPeople(serverData['nab:people'] as Person[])
          }
          if (Array.isArray(serverData['nab:activities']) && serverData['nab:activities'].length > 0) {
            setActivities(serverData['nab:activities'] as Activity[])
          }
          if (Array.isArray(serverData['nab:audit']) && serverData['nab:audit'].length > 0) {
            setAudit(serverData['nab:audit'] as Audit[])
          }
          if (Array.isArray(serverData['nab:users']) && serverData['nab:users'].length > 0) {
            setUsers((serverData['nab:users'] as unknown[]).map(normalizeUser))
          }
          if (Array.isArray(serverData['nab:roles']) && serverData['nab:roles'].length > 0) {
            setRoles(serverData['nab:roles'] as RoleDef[])
          }
          if (Array.isArray(serverData['nab:notes']) && serverData['nab:notes'].length > 0) {
            setNotes(serverData['nab:notes'] as Note[])
          }
        }
      }
    }
    initServerSync()
  }, [])

  // تنظیم فونت و تم
  useEffect(() => {
    applySavedFont()
    document.documentElement.dataset.theme = theme
    syncSave('nab:theme', theme)
  }, [theme])

  const sessionUsername = session?.username ?? ''
  const currentUser: User | null = useMemo(() => {
    if (!sessionUsername) return null
    return (
      users.find(u => u.username === sessionUsername) ?? {
        name: 'کاربر سیستم',
        username: sessionUsername,
        role: 'admin',
        title: 'مدیر ارشد',
        tone: 'blue',
        password: '',
        active: true,
        permissions: [
          'view_persons',
          'create_person',
          'edit_person',
          'change_status',
          'view_activities',
          'manage_users',
          'view_reports',
          'delete_person',
        ] as Permission[],
      }
    )
  }, [users, sessionUsername])

  const has = (p: Permission) => Boolean(currentUser?.permissions.includes(p))

  // ذخیره در حافظه محلی و ارسال به هاست
  useEffect(() => {
    syncSave('nab:people', people)
    syncSave('nab:activities', activities)
    syncSave('nab:audit', audit)
    syncSave('nab:users', users)
    syncSave('nab:roles', roles)
    syncSave('nab:notes', notes)
    save('nab:session', session)
    save('nab:sidebar-collapsed', collapsed)
  }, [people, activities, audit, users, roles, notes, session, collapsed])

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
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const auditLog = (action: string, target: string) => {
    const entry: Audit = { id: uid('AUD'), action, target, createdAt: nowStamp(), createdBy: currentUser?.name ?? 'کاربر' }
    setAudit(cur => [entry, ...cur])
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
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
    showToast(`پرونده «${p.firstName} ${p.lastName}» در سرور ذخیره شد.`)
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
    showToast('پرونده با موفقیت از سرور حذف شد.')
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

  if (!session || !currentUser) {
    return (
      <Login
        users={users}
        onLogin={u => {
          setSession({ username: u.username })
          playChime('success')
        }}
      />
    )
  }

  const navItems: [Page, string, string, Permission?][] = [
    ['dashboard', 'داشبورد', 'grid'],
    ['persons', 'افراد و پرونده‌ها', 'users', 'view_persons'],
    ['workflow', 'گردش‌کار', 'workflow', 'view_persons'],
    ['activities', 'رویدادها', 'activity', 'view_activities'],
    ['users', 'کاربران و دسترسی', 'shield', 'manage_users'],
    ['reports', 'گزارش‌ها و تحلیل', 'activity', 'view_reports'],
    ['settings', 'تنظیمات', 'settings'],
  ]

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
        <button
          type="button"
          className={cn('absolute -left-4 top-8 grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800', focusRing, transition, collapsed && 'rotate-180')}
          onClick={() => setCollapsed(c => !c)}
          title="جمع / باز کردن نوار کناری"
          aria-label="جمع / باز کردن نوار کناری"
        >
          <Icon name="previous" />
        </button>
        <div className="flex items-center gap-3 px-2 py-3">
          <b className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-lg font-black text-white shadow-sm">ن</b>
          <span className={cn('min-w-0', collapsed && 'hidden')}>
            <strong className="block text-sm font-bold text-slate-950 dark:text-white">ناب</strong>
            <small className="block truncate text-xs text-slate-500 dark:text-slate-400">مدیریت پرونده و کارها</small>
          </span>
        </div>
        <div className={cn('mb-2 mt-6 px-3 text-xs font-semibold text-slate-400', collapsed && 'sr-only')}>منوی اصلی</div>
        <nav className="flex-1 space-y-1">
          {navItems.map(([key, label, iconName, perm]) => {
            if (perm && !has(perm)) return null
            return (
              <button
                type="button"
                key={key}
                className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white', focusRing, transition, page === key && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300', collapsed && 'justify-center px-2')}
                onClick={() => {
                  setPage(key)
                  setCalOpen(false)
                }}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
              >
                <Icon name={iconName} />
                <span className={collapsed ? 'hidden' : ''}>{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button type="button" className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-xl p-2 text-right hover:bg-slate-100 dark:hover:bg-slate-800', focusRing, transition, collapsed && 'justify-center')} onClick={() => setProfileOpen(true)} title={collapsed ? 'نمایش پروفایل' : undefined} aria-label={collapsed ? 'نمایش پروفایل' : undefined}>
              <Avatar text={currentUser.name[0]} src={currentUser.photo} size={34} />
              <span className={collapsed ? 'hidden' : 'min-w-0'}>
                <b className="block truncate text-sm text-slate-800 dark:text-slate-100">{currentUser.name}</b>
                <small className="block truncate text-xs text-slate-500 dark:text-slate-400">{currentUser.title}</small>
              </span>
            </button>
            <button
              type="button"
              className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300', focusRing, transition, collapsed && 'hidden')}
              onClick={() => {
                setSession(null)
                playChime('alert')
              }}
              title="خروج از حساب"
              aria-label="خروج از حساب"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      <main className={cn('min-h-screen transition-[padding] duration-200 lg:pr-72', collapsed && 'lg:pr-20')}>
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-3 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-950/90">
          <div className="min-w-0 flex-1">
            <span>
              خانه / <b>{navItems.find(n => n[0] === page)?.[1]}</b>
            </span>
            <div className="relative hidden sm:block">
              <button
                type="button"
                className={cn('flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800', focusRing, transition)}
                onClick={() => setCalOpen(o => !o)}
                title="نمایش تقویم شمسی"
              >
                <time>{headerDate}</time>
                <LiveClock />
              </button>
              {calOpen && <MiniCalendar activityDays={activityDayKeys} onPick={() => setCalOpen(false)} />}
            </div>
            {isServerConnected !== null && (
              <span
                className="mr-2 hidden items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 sm:inline-flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                title={isServerConnected ? 'داده‌ها روی هاست ذخیره و همگام می‌شوند' : 'اتصال هاست برقرار نیست؛ ذخیره در مرورگر'}
              >
                <i className={`h-[6px] w-[6px] rounded-full ${isServerConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isServerConnected ? 'ذخیره در هاست فعال' : 'حالت محلی'}
              </span>
            )}
          </div>

          <button
            type="button"
            className={cn('hidden min-w-0 max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-700 md:flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800', focusRing, transition)}
            onClick={() => setSearchOpen(true)}
            title="پالت دستورات سریع و جستجو (Ctrl+K)"
          >
            <Icon name="search" /> جستجو یا دستور... <kbd>Ctrl+K</kbd>
          </button>

          <div className="flex items-center gap-2">
            {/* Theme Multi-Picker */}
            <div className="relative">
              <button
                type="button"
                className={cn('grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800', focusRing, transition)}
                onClick={() => setThemeMenuOpen(o => !o)}
                title="انتخاب تم رنگی"
                aria-label="انتخاب تم رنگی"
              >
                {theme === 'light' ? <Icon name="sun" /> : <Icon name="moon" />}
              </button>
              {themeMenuOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900" onClick={() => setThemeMenuOpen(false)}>
                  {(['light', 'dark', 'midnight', 'emerald', 'cobalt'] as ThemeMode[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800', focusRing, transition, theme === t && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300')}
                      onClick={() => setTheme(t)}
                    >
                      <span className="h-3 w-3 rounded-full bg-slate-400" />
                      <span>{themeLabels[t].label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className={cn(btnPrimary, 'hidden sm:inline-flex')}
              onClick={() => {
                window.history.pushState({}, '', '/tasks')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
              title="ورود به بخش کارهای من"
            >
              <Icon name="task" className="h-[15px] w-[15px]" />
              کارهای من
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
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
                if (!window.confirm(`حذف ${ids.length} پرونده انتخاب‌شده؟`)) return
                setPeople(cur => cur.filter(p => !ids.includes(p.id)))
                showToast(`${ids.length} پرونده حذف شدند.`)
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
              onDelete={u => {
                if (u.username === currentUser.username) {
                  alert('نمی‌توانید حساب کاربری خود را حذف کنید.')
                  return
                }
                if (window.confirm(`حذف کاربر «${u.name}»؟`)) {
                  setUsers(cur => cur.filter(x => x.username !== u.username))
                  showToast('کاربر حذف شد.')
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
          onCreate={u => {
            setUsers(cur => [...cur, u])
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
          onSave={(u) => {
            setUsers(cur => cur.map(x => (x.username === u.username ? u : x)))
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
          onSave={(name, photo, pw) => {
            const up: User = { ...currentUser, name, photo: photo || undefined, password: pw || currentUser.password }
            setUsers(cur => cur.map(x => (x.username === currentUser.username ? up : x)))
            setProfileOpen(false)
            showToast('پروفایل به‌روزرسانی شد.')
          }}
          onLogout={() => setSession(null)}
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
          onOpenCreateTask={() => {
            window.history.pushState({}, '', '/tasks')
            window.dispatchEvent(new PopStateEvent('popstate'))
          }}
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

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {navItems.slice(0, 5).map(([key, label, iconName, perm]) => !perm || has(perm) ? <button key={key} type="button" onClick={() => setPage(key)} className={cn('flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] text-slate-500 dark:text-slate-400', focusRing, transition, page === key && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300')}><Icon name={iconName} /><span className="truncate">{label}</span></button> : null)}
      </nav>
      {toast && <div className="fixed bottom-20 left-4 z-[60] max-w-sm rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl lg:bottom-6">{toast}</div>}
    </div>
  )
}
