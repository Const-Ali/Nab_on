import { Button } from './components/common/Button'
import { ThemeToggle } from './components/common/ThemeToggle'
import { NotificationCenter } from './components/common/NotificationCenter'
import { ExcelImportModal } from './components/modals/ExcelImportModal'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  jalaliMonthNames,
  jalaliParts,
  load,
  loadTheme,
  nowStamp,
  nowTs,
  timestampToMs,
  normalizeDigits,
  formatServerTimestamp,
  playChime,
  save,
  sendBrowserNotification,
  uid,
} from './shared'
import {
  ApiError,
  bootstrap as bootstrapServer,
  deleteUser as deleteUserOnServer,
  fetchNotifications,
  fetchServerPeopleForExport,
  importPeople as importPeopleOnServer,
  markNotificationsRead,
  getSetupStatus,
  hasRecentUserActivity,
  touchSession,
  importLegacyState,
  importLegacyTasks,
  login as loginOnServer,
  logout as logoutFromServer,
  saveUser as createUserOnServer,
  setupAdmin as setupAdminOnServer,
  saveWorkflow as saveWorkflowOnServer,
  savePeopleBundle,
  saveNotesBundle,
  syncSave,
  verifyLoginMfa,
  startTotpEnrollment,
  confirmTotpEnrollment,
  updateProfile as updateProfileOnServer,
  updateUser as updateUserOnServer,
} from './api-client'
import { Avatar, MiniCalendar } from './shared-ui'
import {
  deadlineLeft,
  buildMonthlyActivityTrend,
  defaultRoles,
  normalizeUser,
  downloadCsv,
  applyFont,
  defaultSettings,
} from './app-lib'
import type {
  Page,
  Permission,
  RoleDef,
  Person,
  Activity,
  Audit,
  User,
  Note,
  AppNotification,
  PeopleImportRow,
  PersonFilter,
  ThemeMode,
  AppSettings,
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
import { WorkflowManager } from './components/modals/WorkflowManager'
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
import { defaultWorkflowConfig, normalizeWorkflowConfig, checklistMissing, stageById, stageIdForPerson } from './workflow'
import type { WorkflowConfig } from './workflow'

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

function PageIcon({ name }: { name: Page | 'more' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === 'dashboard' && <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>}
      {name === 'persons' && <><circle cx="10" cy="8" r="3.4" /><path d="M3.7 20v-1.5a3.4 3.4 0 0 1 3.4-3.4h5.8a3.4 3.4 0 0 1 3.4 3.4V20" /><path d="M16.2 4.8a3.4 3.4 0 0 1 0 6.4M18.1 15.2a3.3 3.3 0 0 1 2.2 3.1V20" /></>}
      {name === 'workflow' && <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 6h4a6 6 0 0 1 6 6v4M6 8v8a2 2 0 0 0 2 2h8" /></>}
      {name === 'activities' && <><path d="M4 12h3l2.2-5 4.4 10 2.2-5H20" /><path d="M4 4v16M20 4v16" opacity=".35" /></>}
      {name === 'users' && <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3.5 20v-1.3a3.7 3.7 0 0 1 3.7-3.7h3.6a3.7 3.7 0 0 1 3.7 3.7V20M15 15.2a3.3 3.3 0 0 1 5.5 2.5V20" /></>}
      {name === 'reports' && <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>}
      {name === 'settings' && <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" transform="translate(0 1) scale(.92)" /></>}
      {name === 'tasks' && <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 .9.9L6 5.2M3.5 12l.9.9L6 11.2M3.5 18l.9.9L6 17.2" /></>}
      {name === 'more' && <><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" /></>}
    </svg>
  )
}

export default function App() {
  const [session, setSession] = useState<{ username: string } | null>(null)
  const notificationOwnerRef = useRef('')
  const [authReady, setAuthReady] = useState(false)
  const [serverReady, setServerReady] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [serverMessage, setServerMessage] = useState('')

  const [page, setPage] = useState<Page>('dashboard')
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultSettings)
  const [totpEnrolled, setTotpEnrolled] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig>(defaultWorkflowConfig)
  const [workflowVersion, setWorkflowVersion] = useState('')
  const [workflowManagerOpen, setWorkflowManagerOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [excelImportOpen, setExcelImportOpen] = useState(false)
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
  const [editingRole, setEditingRole] = useState<RoleDef | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(() => load('nab:sidebar-collapsed', false))
  // Old saved color themes are folded into the single dark mode for compatibility.
  const [theme, setTheme] = useState<ThemeMode>(loadTheme)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [isServerConnected, setIsServerConnected] = useState<boolean | null>(null)
  const [legacySnapshot, setLegacySnapshot] = useState<LegacySnapshot | null>(null)
  const [legacyCanImport, setLegacyCanImport] = useState(false)

  const applyServerBootstrap = (data: Awaited<ReturnType<typeof bootstrapServer>>) => {
    notificationOwnerRef.current = data.user.username
    setTotpEnrolled(Boolean(data.security?.totp_enrolled))
    setNotifications([])
    setNotificationsOpen(false)
    setNotificationError('')
    setSession({ username: data.user.username })
    setUsers(data.users.map(normalizeUser))
    setPeople(Array.isArray(data.state['nab:people']) ? data.state['nab:people'] as Person[] : [])
    setWorkflowConfig(normalizeWorkflowConfig(data.state['nab:workflow']?.[0]))
    setWorkflowVersion(data.state_versions['nab:workflow'] ?? '')
    setActivities(Array.isArray(data.state['nab:activities']) ? data.state['nab:activities'] as Activity[] : [])
    setAudit(Array.isArray(data.state['nab:audit']) ? data.state['nab:audit'] as Audit[] : [])
    setRoles(Array.isArray(data.state['nab:roles']) && data.state['nab:roles'].length ? data.state['nab:roles'] as RoleDef[] : defaultRoles)
    setNotes(Array.isArray(data.state['nab:notes']) ? data.state['nab:notes'] as Note[] : [])
    const settingsRow = Array.isArray(data.state['nab:settings']) ? data.state['nab:settings'][0] as Partial<AppSettings> | undefined : undefined
    const nextSettings = { ...defaultSettings, ...(settingsRow ?? {}) }
    setAppSettings(nextSettings)
    applyFont(nextSettings.font)
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
      || (typeof data.user_count === 'number' ? data.user_count > 1 : data.users.length > 1)
    const legacyRaw = readLegacySnapshot(data.user.username, isAdmin)
    const legacyPermissions = new Set(data.user.permissions)
    let legacy = legacyRaw
    if (legacyRaw) {
      const permittedState = { ...legacyRaw.state }
      if (!legacyPermissions.has('view_persons')) {
        delete permittedState['nab:people']
        delete permittedState['nab:notes']
      } else if (!legacyPermissions.has('view_person_notes')) delete permittedState['nab:notes']
      if (!legacyPermissions.has('view_activities')) delete permittedState['nab:activities']
      if (!legacyPermissions.has('view_audit_log')) delete permittedState['nab:audit']
      if (!legacyPermissions.has('manage_roles') && !legacyPermissions.has('create_role')) delete permittedState['nab:roles']
      if (!legacyPermissions.has('view_tasks') || !legacyPermissions.has('create_task')) delete permittedState.tasks
      legacy = { ...legacyRaw, state: permittedState }
      if (!Object.values(permittedState).some(rows => rows.length > 0) && !legacy.hasLegacyUsers) legacy = null
    }
    setLegacySnapshot(legacy)
    const canImportLegacyTasks = Boolean(legacyPermissions.has('view_tasks') && legacyPermissions.has('create_task') && legacy?.state.tasks?.length && (!Array.isArray(currentTasks) || currentTasks.length === 0) && (!Array.isArray(taskMarker) || taskMarker.length === 0))
    const hasLegacyState = Boolean(legacy && Object.values(legacy.state).some(rows => rows.length > 0))
    const migrationPermissionSets = [
      ['nab:people', ['view_persons', 'create_person']],
      ['nab:activities', ['view_activities']],
      ['nab:audit', ['view_audit_log']],
      ['nab:notes', ['view_persons', 'view_person_notes', 'create_person_note']],
      ['tasks', ['view_tasks', 'create_task']],
    ] as const
    const hasSharedImportPermissions = migrationPermissionSets.every(([key, required]) =>
      !legacy?.state[key]?.length || required.every(permission => legacyPermissions.has(permission)),
    )
    const legacyRoleRows = legacy?.state['nab:roles'] ?? []
    const builtInRoleIds = new Set(['admin', 'assistant', 'reviewer'])
    const hasLegacyRoleImportPermission = !legacyRoleRows.some(role => !builtInRoleIds.has(String((role as { id?: unknown }).id ?? ''))) || legacyPermissions.has('create_role') || legacyPermissions.has('manage_roles')
    const canImportLegacy = isAdmin
      ? Boolean(hasLegacyState && hasSharedImportPermissions && hasLegacyRoleImportPermission && !serverHasRecords && (!legacy?.state.tasks?.length || canImportLegacyTasks))
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
      notificationOwnerRef.current = ''
      setSession(null)
      setServerReady(false)
      setTotpEnrolled(false)
      setUsers([])
      setPeople([])
      setWorkflowConfig(defaultWorkflowConfig)
      setWorkflowVersion('')
      setActivities([])
      setAudit([])
      setRoles([])
      setNotes([])
      setNotifications([])
      setNotificationsOpen(false)
      setExcelImportOpen(false)
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

  // تم یک ترجیح مرورگری است؛ فونت سامانه از تنظیمات مشترک سرور خوانده می‌شود.
  useLayoutEffect(() => {
    applyFont(appSettings.font)
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    save('nab:theme', theme)
  }, [theme, appSettings.font])

  // Keep internal page navigation predictable, especially after leaving long mobile lists.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  useEffect(() => { save('nab:sidebar-collapsed', collapsed) }, [collapsed])

  const sessionUsername = session?.username ?? ''
  const currentUser: User | null = useMemo(
    () => sessionUsername ? users.find(user => user.username === sessionUsername && user.active) ?? null : null,
    [users, sessionUsername],
  )
  const activityTrend = useMemo(() => buildMonthlyActivityTrend(activities), [activities])

  const has = (p: Permission) => Boolean(currentUser?.permissions.includes(p))
  const canViewPeople = has('view_persons')
  const canCreateUsers = has('manage_users') || has('create_user')
  const canEditUsers = has('manage_users') || has('edit_user')
  const canDeleteUsers = has('manage_users') || has('delete_user')
  const canManageUsers = canCreateUsers || canEditUsers || canDeleteUsers
  const canViewUsers = has('view_users') || canManageUsers
  const canCreateRoles = has('manage_roles') || has('create_role')
  const canEditRoles = has('manage_roles') || has('edit_role')
  const canDeleteRoles = has('manage_roles') || has('delete_role')
  const canManageRoles = canCreateRoles || canEditRoles || canDeleteRoles
  const canViewRoles = has('view_roles') || canManageRoles
  const canExportBackup = has('export_backup')
  const canRestoreBackup = has('restore_backup')
  const canPurgeServerData = currentUser?.role === 'admin' && has('purge_server_data')
  const canViewUserDirectory = canViewUsers || canViewRoles || canExportBackup || canRestoreBackup || canPurgeServerData
  const canViewSettings = has('view_settings') || has('manage_settings') || has('manage_workflow')
  const canOpenPage = (target: Page): boolean => {
    switch (target) {
      case 'dashboard': return has('view_dashboard')
      case 'persons': return has('view_persons')
      case 'workflow': return has('view_workflow')
      case 'activities': return has('view_activities')
      case 'users': return canViewUserDirectory
      case 'reports': return has('view_reports')
      case 'settings': return canViewSettings
      case 'tasks': return has('view_tasks')
    }
  }
  const toggleTheme = () => setTheme(current => current === 'dark' ? 'light' : 'dark')

  useEffect(() => {
    if (!serverReady || !sessionUsername || !canViewPeople) {
      const clearTimer = window.setTimeout(() => {
        setNotifications([])
        setNotificationError('')
      }, 0)
      return () => window.clearTimeout(clearTimer)
    }
    let active = true
    const refresh = async () => {
      try {
        const result = await fetchNotifications()
        if (active) {
          setNotifications(result.items)
          setNotificationError('')
        }
      } catch (cause) {
        if (active) setNotificationError(cause instanceof Error ? cause.message : 'دریافت اعلان‌ها ناموفق بود.')
      }
    }
    const startTimer = window.setTimeout(() => { void refresh() }, 0)
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 60_000)
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      window.clearTimeout(startTimer)
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [serverReady, sessionUsername, canViewPeople])

  // یادآور سررسید
  useEffect(() => {
    if (session) {
      const urgentPeople = people.filter(p => {
        const left = deadlineLeft(p, workflowConfig)
        return left !== null && left <= 1
      })
      if (urgentPeople.length > 0) {
        sendBrowserNotification('یادآور سررسید پرونده‌ها - سامانه ناب', {
          body: `تعداد ${urgentPeople.length} پرونده دارای موعد رسیدگی امروز یا گذشته هستند.`,
        })
      }
    }
  }, [session, people, workflowConfig])

  // کلید میانبر Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setMobileMoreOpen(false)
        setCalOpen(false)
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!mobileMoreOpen && !calOpen && !notificationsOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return
      const popover = event.target.closest('[data-app-popover]')?.getAttribute('data-app-popover')
      if (mobileMoreOpen && popover !== 'mobile-more') setMobileMoreOpen(false)
      if (calOpen && popover !== 'calendar') setCalOpen(false)
      if (notificationsOpen && popover !== 'notifications') setNotificationsOpen(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMoreOpen(false)
        setCalOpen(false)
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [mobileMoreOpen, calOpen, notificationsOpen])

  const auditLog = (action: string, target: string): Audit => ({
    id: uid('AUD'), action, target, createdAt: nowStamp(), createdBy: currentUser?.name ?? 'کاربر',
  })

  const makeActivity = (entry: Pick<Activity, 'personId' | 'personName' | 'action'> & Partial<Pick<Activity, 'previousStatus' | 'newStatus' | 'rejectionReason' | 'details'>>): Activity => ({
    id: uid('ACT'),
    previousStatus: null,
    newStatus: null,
    rejectionReason: null,
    ...entry,
    createdAt: nowStamp(),
    createdBy: currentUser?.name ?? 'کاربر',
    createdByRole: currentUser?.role ?? 'admin',
    ts: nowTs(),
  })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const commitPeopleBundle = async (nextPeople: Person[], nextActivities: Activity[], nextAudit: Audit[]) => {
    try {
      const result = await savePeopleBundle(nextPeople, nextActivities, nextAudit)
      setPeople(result.people)
      setActivities(result.activities ?? nextActivities)
      setAudit(result.audit ?? nextAudit)
      setIsServerConnected(true)
      setServerMessage('')
      return result
    } catch (cause) {
      setIsServerConnected(false)
      setServerMessage(cause instanceof Error ? cause.message : 'ذخیرهٔ پرونده و سوابق روی هاست ناموفق بود.')
      throw cause
    }
  }

  const commitNotesBundle = async (nextNotes: Note[], nextActivities: Activity[]) => {
    try {
      const result = await saveNotesBundle(nextNotes, nextActivities)
      setNotes(result.notes)
      setActivities(result.activities ?? nextActivities)
      setIsServerConnected(true)
      setServerMessage('')
      return result
    } catch (cause) {
      setIsServerConnected(false)
      setServerMessage(cause instanceof Error ? cause.message : 'ذخیرهٔ یادداشت و رویداد همراه آن ناموفق بود.')
      throw cause
    }
  }

  const handleExcelImport = async (rows: PeopleImportRow[]) => {
    if (!currentUser || !has('import_people_excel') || !has('view_persons') || !has('create_person')) {
      throw new Error('برای ورود گروهی، مجوز مشاهده، ایجاد پرونده و ورود از Excel لازم است.')
    }
    const result = await importPeopleOnServer(rows)
    setPeople(result.people)
    if (result.audit) setAudit(result.audit)
    if (result.activities) setActivities(result.activities)
    setExcelImportOpen(false)
    showToast(`${result.importedCount.toLocaleString('fa-IR')} پرونده از Excel روی سرور ثبت شد.`)
  }

  const handleExportServerPeople = async () => {
    if (!has('view_persons') || !has('export_people_excel')) {
      showToast('برای دریافت Excel، مجوز مشاهده و خروجی پرونده‌ها لازم است.')
      return
    }
    try {
      const serverData = await fetchServerPeopleForExport()
      const { downloadServerPeopleXlsx } = await import('./excel')
      await downloadServerPeopleXlsx(serverData.people)
      showToast('فایل Excel از پرونده‌های واقعی سرور آماده شد.')
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'ساخت فایل Excel ناموفق بود.')
    }
  }

  const handleSaveWorkflow = async (nextConfig: WorkflowConfig) => {
    if (!has('manage_workflow')) throw new Error('مجوز مدیریت گردش‌کار را ندارید.')
    if (!workflowVersion) throw new Error('نسخهٔ گردش‌کار در دسترس نیست؛ صفحه را تازه‌سازی کنید.')
    const result = await saveWorkflowOnServer(nextConfig, workflowVersion)
    setWorkflowVersion(result.version)
    if (result.audit) setAudit(result.audit)
    setWorkflowConfig(nextConfig)
    const renamePerson = (person: Person): Person => {
      const id = stageIdForPerson(person, nextConfig)
      const stage = stageById(nextConfig, id)
      return { ...person, stageId: id, status: stage?.label ?? person.status }
    }
    setPeople(cur => cur.map(renamePerson))
    setSelected(cur => cur ? renamePerson(cur) : cur)
    setWorkflowManagerOpen(false)
    showToast('گردش‌کار با موفقیت ذخیره شد؛ مسیرهای فعلی حفظ شدند.')
  }


  const handleSaveSettings = async (nextSettings: AppSettings) => {
    if (!has('manage_settings')) throw new Error('مجوز ویرایش تنظیمات را ندارید.')
    await syncSave('nab:settings', [nextSettings])
    setAppSettings(nextSettings)
    applyFont(nextSettings.font)
    showToast('تنظیمات مشترک سامانه روی سرور ذخیره شد.')
  }

  const handleLogout = async () => {
    notificationOwnerRef.current = ''
    try { await logoutFromServer() } catch { /* The local view is cleared even if the host is offline. */ }
    setSession(null)
    setServerReady(false)
    setTotpEnrolled(false)
    setUsers([])
    setPeople([])
    setWorkflowConfig(defaultWorkflowConfig)
    setWorkflowVersion('')
    setAppSettings(defaultSettings)
    setWorkflowManagerOpen(false)
    setActivities([])
    setAudit([])
    setRoles([])
    setNotes([])
    setNotifications([])
    setNotificationsOpen(false)
    setExcelImportOpen(false)
    setProfileOpen(false)
    setServerMessage('از حساب خارج شدید.')
  }

  useEffect(() => {
    if (!serverReady || !sessionUsername || !appSettings.autoLogout) return
    const timeoutMs = appSettings.autoLogoutMins * 60_000
    let lastActivityAt = Date.now()
    let expired = false
    let timer = 0
    const expire = () => {
      if (expired) return
      expired = true
      window.dispatchEvent(new CustomEvent('nab:auth-expired'))
      void logoutFromServer().catch(() => undefined)
    }
    const schedule = () => {
      window.clearTimeout(timer)
      const remaining = timeoutMs - (Date.now() - lastActivityAt)
      timer = window.setTimeout(expire, Math.max(0, remaining))
    }
    const markActivity = () => {
      lastActivityAt = Date.now()
      schedule()
    }
    const checkAfterVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivityAt >= timeoutMs) expire()
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
  }, [serverReady, sessionUsername, appSettings.autoLogout, appSettings.autoLogoutMins])

  useEffect(() => {
    if (!serverReady || !sessionUsername || !appSettings.autoLogout) return
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && hasRecentUserActivity(75_000)) {
        void touchSession().catch(() => undefined)
      }
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [serverReady, sessionUsername, appSettings.autoLogout])

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
    setCalOpen(false)
    if (!has('view_tasks')) { showToast('مجوز دسترسی به بخش کارهای من را ندارید.'); return }
    if (window.location.pathname !== '/tasks') {
      window.history.pushState({}, '', '/tasks')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const handleCreatePerson = async (p: Person) => {
    if (!has('view_persons') || !has('create_person')) throw new Error('برای ایجاد پرونده، مجوز مشاهده و ایجاد لازم است.')
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
    const auditEntry = auditLog('افزودن فرد جدید', `${p.firstName} ${p.lastName} (${p.id})`)
    await commitPeopleBundle([p, ...people], [act, ...activities], [auditEntry, ...audit])
    setCreateOpen(false)
    playChime('success')
    showToast(`پرونده «${p.firstName} ${p.lastName}» ثبت شد.`)
  }

  const handleUpdateStatus = async (p: Person, targetStageId: string, reason: string | null) => {
    if (!has('change_status')) { showToast('مجوز تغییر مرحله را ندارید.'); return }
    const currentStageId = stageIdForPerson(p, workflowConfig)
    const currentStage = stageById(workflowConfig, currentStageId)
    const targetStage = stageById(workflowConfig, targetStageId)
    if (!currentStage || !targetStage || targetStage.archived || !currentStage.nextStageIds.includes(targetStageId)) {
      showToast('این مسیر انتقال در گردش‌کار تعریف نشده است.')
      return
    }
    const missing = checklistMissing(currentStage, p)
    if (missing.length) {
      showToast(`ابتدا چک‌لیست مرحله را تکمیل کنید: ${missing.map(item => item.label).join('، ')}`)
      return
    }
    if (currentStageId === targetStageId) return
    const prev = currentStage.label
    const next = targetStage.label
    const stageEnteredAt = new Date().toISOString()
    const updated: Person = {
      ...p,
      stageId: targetStageId,
      status: next,
      stageEnteredAt,
      updatedAt: nowStamp(),
      updatedBy: currentUser?.name ?? 'کاربر',
      ts: Date.parse(stageEnteredAt),
    }
    const act: Activity = {
      id: uid('ACT'),
      personId: p.id,
      personName: `${p.firstName} ${p.lastName}`,
      action: targetStageId === 'rejected' ? 'رد پرونده' : 'تغییر وضعیت',
      previousStatus: prev,
      newStatus: next,
      rejectionReason: reason,
      createdAt: nowStamp(),
      createdBy: currentUser?.name ?? 'کاربر',
      createdByRole: currentUser?.role ?? 'admin',
      ts: nowTs(),
    }
    const auditEntry = auditLog('تغییر وضعیت پرونده', `${p.id}: از «${prev}» به «${next}»`)
    try {
      const result = await commitPeopleBundle(people.map(x => x.id === p.id ? updated : x), [act, ...activities], [auditEntry, ...audit])
      setSelected(result.people.find(person => person.id === p.id) ?? updated)
      playChime('complete')
      showToast(`مرحلهٔ پرونده به «${next}» به‌روزرسانی شد.`)
    } catch (cause) {
      showToast(cause instanceof Error ? `ذخیرهٔ تغییر مرحله ناموفق بود: ${cause.message}` : 'ذخیرهٔ تغییر مرحله ناموفق بود.')
    }
  }

  const handleChecklistToggle = async (p: Person, stageId: string, itemId: string, done: boolean) => {
    if (!has('complete_checklist') || !done) return
    const currentStageId = stageIdForPerson(p, workflowConfig)
    const stage = stageById(workflowConfig, stageId)
    const item = stage?.checklist.find(rule => rule.id === itemId)
    const existingMark = p.stageChecklist?.[stageId]?.[itemId]
    if (stageId !== currentStageId || !stage || !item || existingMark?.done) return
    const checkedAt = new Date().toISOString()
    const updated: Person = {
      ...p,
      stageChecklist: {
        ...(p.stageChecklist ?? {}),
        [stageId]: {
          ...(p.stageChecklist?.[stageId] ?? {}),
          [itemId]: { done: true, checkedBy: currentUser?.name ?? 'کاربر', checkedAt },
        },
      },
      updatedAt: nowStamp(),
      updatedBy: currentUser?.name ?? 'کاربر',
      ts: nowTs(),
    }
    const activity: Activity = {
      id: uid('ACT'),
      personId: p.id,
      personName: `${p.firstName} ${p.lastName}`,
      action: 'تکمیل چک‌لیست',
      previousStatus: null,
      newStatus: null,
      rejectionReason: `${stage.label}: ${item.label}`,
      createdAt: nowStamp(),
      createdBy: currentUser?.name ?? 'کاربر',
      createdByRole: currentUser?.role ?? 'admin',
      ts: nowTs(),
    }
    const auditEntry = auditLog('تکمیل چک‌لیست', `${p.id}: ${stage.label} — ${item.label}`)
    try {
      const result = await commitPeopleBundle(people.map(person => person.id === p.id ? updated : person), [activity, ...activities], [auditEntry, ...audit])
      setSelected(result.people.find(person => person.id === p.id) ?? updated)
      showToast(`«${item.label}» با نام شما و زمان ثبت ذخیره شد.`)
    } catch (cause) {
      showToast(cause instanceof Error ? `ذخیرهٔ چک‌لیست ناموفق بود: ${cause.message}` : 'ذخیرهٔ چک‌لیست ناموفق بود.')
    }
  }

  const handleBulkStatus = async (ids: string[], targetStageId: string): Promise<boolean> => {
    if (!has('change_status')) { showToast('مجوز تغییر مرحله را ندارید.'); return false }
    const selectedPeople = people.filter(person => ids.includes(person.id))
    if (!selectedPeople.length || selectedPeople.length !== new Set(ids).size) { showToast('فهرست پرونده‌های انتخاب‌شده معتبر نیست.'); return false }
    const sourceIds = new Set(selectedPeople.map(person => stageIdForPerson(person, workflowConfig)))
    if (sourceIds.size !== 1) { showToast('انتقال گروهی فقط برای پرونده‌های هم‌مرحله ممکن است.'); return false }
    const sourceId = [...sourceIds][0]
    const sourceStage = stageById(workflowConfig, sourceId)
    const targetStage = stageById(workflowConfig, targetStageId)
    if (!sourceStage || !targetStage || targetStage.archived || targetStageId === 'rejected' || !sourceStage.nextStageIds.includes(targetStageId)) {
      showToast('مرحلهٔ مقصد در مسیر بعدی مشترک این پرونده‌ها نیست.')
      return false
    }
    const incomplete = selectedPeople.filter(person => checklistMissing(sourceStage, person).length > 0)
    if (incomplete.length) { showToast(`چک‌لیست ${incomplete.length.toLocaleString('fa-IR')} پرونده کامل نیست؛ انتقال انجام نشد.`); return false }
    const timestamp = nowStamp()
    const now = nowTs()
    const stageEnteredAt = new Date(now).toISOString()
    const updated = selectedPeople.map(person => ({ ...person, stageId: targetStageId, status: targetStage.label, stageEnteredAt, updatedAt: timestamp, updatedBy: currentUser?.name ?? 'کاربر', ts: now }))
    const byId = new Map(updated.map(person => [person.id, person]))
    const nextPeople = people.map(person => byId.get(person.id) ?? person)
    const events: Activity[] = updated.map(person => ({
      id: uid('ACT'), personId: person.id, personName: `${person.firstName} ${person.lastName}`,
      action: 'تغییر وضعیت', previousStatus: sourceStage.label, newStatus: targetStage.label,
      rejectionReason: null, createdAt: timestamp, createdBy: currentUser?.name ?? 'کاربر',
      createdByRole: currentUser?.role ?? 'admin', ts: now,
    }))
    const auditEntry = auditLog('تغییر وضعیت پرونده', `انتقال گروهی ${updated.length} پرونده از «${sourceStage.label}» به «${targetStage.label}»`)
    try {
      await commitPeopleBundle(nextPeople, [...events, ...activities], [auditEntry, ...audit])
      showToast(`مرحلهٔ ${updated.length.toLocaleString('fa-IR')} پرونده تغییر یافت.`)
      return true
    } catch (cause) {
      showToast(cause instanceof Error ? `ذخیرهٔ انتقال گروهی ناموفق بود: ${cause.message}` : 'ذخیرهٔ انتقال گروهی ناموفق بود.')
      return false
    }
  }

  const handleDeletePerson = async (p: Person) => {
    if (!has('delete_person') || !has('view_persons')) { showToast('مجوز حذف پرونده را ندارید.'); return }
    if (!window.confirm(`آیا از حذف پرونده «${p.firstName} ${p.lastName}» اطمینان دارید؟`)) return
    const activity: Activity = {
      id: uid('ACT'), personId: p.id, personName: `${p.firstName} ${p.lastName}`,
      action: 'حذف پرونده', previousStatus: stageById(workflowConfig, stageIdForPerson(p, workflowConfig))?.label ?? p.status,
      newStatus: null, rejectionReason: null, details: 'پرونده از سامانه حذف شد.',
      createdAt: nowStamp(), createdBy: currentUser?.name ?? 'کاربر', createdByRole: currentUser?.role ?? 'admin', ts: nowTs(),
    }
    const auditEntry = auditLog('حذف پرونده', `${p.firstName} ${p.lastName} (${p.id})`)
    try {
      await commitPeopleBundle(people.filter(person => person.id !== p.id), [activity, ...activities], [auditEntry, ...audit])
      setSelected(null)
      playChime('alert')
      showToast('پرونده حذف شد.')
    } catch (cause) {
      showToast(cause instanceof Error ? `حذف پرونده ناموفق بود: ${cause.message}` : 'حذف پرونده ناموفق بود.')
    }
  }

  const handleEditPerson = async (p: Person, changes: string[]) => {
    if (!has('edit_person') || !has('view_persons')) throw new Error('مجوز ویرایش پرونده را ندارید.')
    const act: Activity = {
      id: uid('ACT'),
      personId: p.id,
      personName: `${p.firstName} ${p.lastName}`,
      action: 'ویرایش اطلاعات فرد',
      previousStatus: null,
      newStatus: null,
      rejectionReason: changes.join(' · '),
      details: changes.join(' · '),
      createdAt: nowStamp(),
      createdBy: currentUser?.name ?? 'کاربر',
      createdByRole: currentUser?.role ?? 'admin',
      ts: nowTs(),
    }
    const auditEntry = auditLog('ویرایش اطلاعات فرد', `${p.id}: ${changes.join('، ')}`)
    const result = await commitPeopleBundle(people.map(person => person.id === p.id ? p : person), [act, ...activities], [auditEntry, ...audit])
    const savedPerson = result.people.find(person => person.id === p.id) ?? p
    setSelected(savedPerson)
    setEditingPerson(null)
    playChime('success')
    showToast('اطلاعات با موفقیت ذخیره شد.')
  }

  const handleAddNote = async (personId: string, text: string, replyTo?: { author: string; text: string }) => {
    if (!has('view_persons') || !has('view_person_notes') || !has('create_person_note')) throw new Error('مجوز ثبت یادداشت پرونده را ندارید.')
    const note: Note = {
      id: uid('NOTE'), personId,
      author: currentUser?.name ?? 'کاربر', authorUsername: currentUser?.username ?? '',
      role: currentUser?.role ?? 'admin', title: currentUser?.title ?? 'کارشناس', text,
      createdAt: nowStamp(), replyTo,
    }
    const person = people.find(candidate => candidate.id === personId)
    const activity = makeActivity({
      personId,
      personName: person ? `${person.firstName} ${person.lastName}` : personId,
      action: 'ثبت یادداشت',
      details: replyTo ? `پاسخ به یادداشت ${replyTo.author}` : 'یادداشت تازه ثبت شد.',
    })
    await commitNotesBundle([...notes, note], [activity, ...activities])
    playChime('click')
    showToast('یادداشت روی سرور ثبت شد.')
  }

  const handleEditNote = async (noteId: string, text: string) => {
    if (!has('view_person_notes') || !has('edit_person_note')) throw new Error('مجوز ویرایش یادداشت را ندارید.')
    const note = notes.find(candidate => candidate.id === noteId)
    if (!note) throw new Error('یادداشت موردنظر پیدا نشد؛ صفحه را تازه‌سازی کنید.')
    const person = people.find(candidate => candidate.id === note.personId)
    const activity = makeActivity({
      personId: note.personId,
      personName: person ? `${person.firstName} ${person.lastName}` : note.personId,
      action: 'ویرایش یادداشت',
      details: 'یادداشت ویرایش شد.',
    })
    const nextNotes = notes.map(item => item.id === noteId ? { ...item, text, edited: true } : item)
    await commitNotesBundle(nextNotes, [activity, ...activities])
    showToast('یادداشت ویرایش شد.')
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!has('view_person_notes') || !has('delete_person_note')) throw new Error('مجوز حذف یادداشت را ندارید.')
    const note = notes.find(candidate => candidate.id === noteId)
    if (!note) throw new Error('یادداشت موردنظر پیدا نشد؛ صفحه را تازه‌سازی کنید.')
    const person = people.find(candidate => candidate.id === note.personId)
    const activity = makeActivity({
      personId: note.personId,
      personName: person ? `${person.firstName} ${person.lastName}` : note.personId,
      action: 'حذف یادداشت',
      details: 'یادداشت حذف شد.',
    })
    await commitNotesBundle(notes.filter(item => item.id !== noteId), [activity, ...activities])
    showToast('یادداشت حذف شد.')
  }

  const exportAllPeople = () => {
    if (!has('view_persons') || !has('export_people_csv')) { showToast('مجوز خروجی CSV پرونده‌ها را ندارید.'); return }
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
    if (!has('view_activities') || !has('export_activities')) { showToast('مجوز خروجی رویدادها را ندارید.'); return }
    downloadCsv(
      'activities.csv',
      ['شناسه', 'پرونده', 'اقدام', 'وضعیت قبلی', 'وضعیت جدید', 'جزئیات', 'علت رد', 'ثبت‌کننده', 'تاریخ'],
      activities.map(a => [
        a.id,
        a.personName,
        a.action,
        a.previousStatus ?? '',
        a.newStatus ?? '',
        a.details ?? '',
        a.rejectionReason ?? '',
        a.createdBy,
        formatServerTimestamp(a.createdAt, a.ts),
      ]),
    )
    showToast('فایل گزارش رویدادها دانلود شد.')
  }

  if (!authReady) {
    return (
      <main className="grid min-h-svh place-items-center bg-slate-50 px-4 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400" dir="rtl" role="status" aria-live="polite">
        <div className="flex flex-col items-center">
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
            <svg className="h-6 w-6 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          <p className="font-medium text-slate-700 dark:text-slate-200">در حال اتصال امن به هاست…</p>
          <small className="mt-2 max-w-sm leading-5 text-slate-500 dark:text-slate-400">اطلاعات پرونده‌ها فقط پس از تأیید اتصال به پایگاه داده بارگذاری می‌شوند.</small>
        </div>
      </main>
    )
  }

  if (setupOpen && needsSetup) {
    return <SetupAdmin
      theme={theme}
      onToggleTheme={toggleTheme}
      onBack={() => setSetupOpen(false)}
      onSetup={async input => {
        const data = await setupAdminOnServer(input)
        applyServerBootstrap(data)
        playChime('success')
      }}
    />
  }

  if (!session || !currentUser) {
    return (
      <Login
        theme={theme}
        onToggleTheme={toggleTheme}
        showSetup={needsSetup}
        serverMessage={serverMessage}
        onShowSetup={() => setSetupOpen(true)}
        onLogin={async (username, password, remember) => {
          const result = await loginOnServer(username, password, remember)
          if ('mfa_required' in result) return result
          applyServerBootstrap(result)
          playChime('success')
        }}
        onVerifyMfa={async (code, remember) => {
          const data = await verifyLoginMfa(code, remember)
          applyServerBootstrap(data)
          playChime('success')
        }}
      />
    )
  }

  const navItems: [Page, string][] = [
    ['dashboard', 'داشبورد'],
    ['persons', 'افراد و پرونده‌ها'],
    ['workflow', 'گردش‌کار'],
    ['activities', 'رویدادها'],
    ['users', 'کاربران و دسترسی'],
    ['reports', 'گزارش‌ها و تحلیل'],
    ['settings', 'تنظیمات'],
  ]
  const primaryNavKeys = new Set<Page>(['dashboard', 'persons', 'workflow', 'activities'])
  const visibleNavItems = navItems.filter(([key]) => canOpenPage(key))
  const mobileNavItems = visibleNavItems.filter(([key]) => primaryNavKeys.has(key))
  const mobileMoreItems = visibleNavItems.filter(([key]) => !primaryNavKeys.has(key))
  const mobileMorePageActive = (page === 'tasks' && has('view_tasks')) || mobileMoreItems.some(([key]) => key === page)
  const compactNavLabels: Record<Page, string> = { dashboard: 'داشبورد', persons: 'افراد', workflow: 'گردش‌کار', activities: 'رویدادها', users: 'کاربران', reports: 'گزارش‌ها', settings: 'تنظیمات', tasks: 'کارها' }

  const todayJ = jalaliParts(new Date())
  const headerDate = `${todayJ.d} ${jalaliMonthNames[todayJ.m - 1]} ${todayJ.y}`
  const activityDayKey = (activity: Activity) => {
    const timestamp = timestampToMs(activity.ts)
    if (timestamp) {
      const parts = jalaliParts(new Date(timestamp))
      return `${parts.y}-${parts.m}-${parts.d}`
    }
    const parts = normalizeDigits(activity.createdAt.split(' · ')[0] ?? '').match(/^(\d{3,4})\/(\d{1,2})\/(\d{1,2})$/)
    return parts ? `${Number(parts[1])}-${Number(parts[2])}-${Number(parts[3])}` : ''
  }
  const activityDayKeys = new Set(activities.map(activityDayKey).filter(Boolean))
  const todayActivityCount = activities.filter(activity => activityDayKey(activity) === `${todayJ.y}-${todayJ.m}-${todayJ.d}`).length

  return (
    <div className={cn('min-h-svh bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100', theme === 'dark' && 'dark')} dir="rtl">
      <aside className={cn('fixed inset-y-0 right-0 z-40 hidden flex-col border-l border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 lg:flex dark:border-slate-800 dark:bg-slate-900', collapsed ? 'w-20' : 'w-72')}>
        <Button
          type="button"
          variant="outline"
          size="none"
          className="absolute left-3 top-16 z-10 grid h-9 w-9 min-h-9 place-items-center rounded-full p-0"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'باز کردن نوار کناری' : 'جمع کردن نوار کناری'}
          aria-label={collapsed ? 'باز کردن نوار کناری' : 'جمع کردن نوار کناری'}
          aria-pressed={collapsed}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            {collapsed ? <path d="m7 4 6 6-6 6" /> : <path d="m13 4-6 6 6 6" />}
          </svg>
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
          {visibleNavItems.map(([key, label]) => (
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
          ))}
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
                void handleLogout()
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

      <main className={cn('min-h-svh transition-[padding] duration-200', collapsed ? 'lg:pr-20' : 'lg:pr-72')}>
        <header className="app-mobile-header sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-slate-200 bg-slate-50/95 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-6 sm:py-3 dark:border-slate-800 dark:bg-slate-950/95">
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm">
              <span className="hidden sm:inline">خانه / </span>
              <b>
                <span className="hidden sm:inline">{navItems.find(n => n[0] === page)?.[1] ?? 'کارهای من'}</span>
                <span className="sm:hidden">{compactNavLabels[page]}</span>
              </b>
            </span>
            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[10px] leading-4 text-slate-500 sm:hidden dark:text-slate-400">
              <time className="shrink-0 max-[360px]:hidden">{headerDate}</time>
              {isServerConnected !== null && (
                <span className="inline-flex min-w-0 items-center gap-1" role="status" title={isServerConnected ? 'داده‌ها روی هاست ذخیره و همگام می‌شوند' : 'اتصال هاست برقرار نیست؛ ذخیره‌سازی روی هاست تأیید نمی‌شود'}>
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', isServerConnected ? 'bg-emerald-500' : 'bg-amber-500')} />
                  <span className="truncate">{isServerConnected ? 'همگام‌سازی هاست' : 'اتصال هاست قطع'}</span>
                </span>
              )}
            </div>
            <div className="relative hidden sm:block" data-app-popover="calendar">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="rounded-lg text-xs text-slate-500 dark:text-slate-400"
                onClick={() => {
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
                title={isServerConnected ? 'داده‌ها روی هاست ذخیره و همگام می‌شوند' : 'اتصال هاست برقرار نیست؛ ذخیره‌سازی روی هاست تأیید نمی‌شود'}
              >
                {isServerConnected ? 'ذخیره در هاست فعال' : 'اتصال هاست قطع'}
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden! min-w-0 max-w-sm flex-1 justify-start text-slate-500 md:flex! dark:text-slate-400"
            onClick={() => {
              setCalOpen(false)
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
            className="md:hidden!"
            onClick={() => {
              setCalOpen(false)
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
            {canViewPeople && <NotificationCenter
              items={notifications}
              isOpen={notificationsOpen}
              error={notificationError}
              onToggle={() => {
                const next = !notificationsOpen
                const owner = sessionUsername
                setNotificationsOpen(next)
                setCalOpen(false)
                setMobileMoreOpen(false)
                if (next) void fetchNotifications().then(result => {
                  if (notificationOwnerRef.current === owner) {
                    setNotifications(result.items)
                    setNotificationError('')
                  }
                }).catch(cause => {
                  if (notificationOwnerRef.current === owner) setNotificationError(cause instanceof Error ? cause.message : 'دریافت اعلان‌ها ناموفق بود.')
                })
              }}
              onOpen={item => {
                const owner = sessionUsername
                setNotificationsOpen(false)
                const person = people.find(candidate => candidate.id === item.personId)
                if (person) {
                  setPage('persons')
                  setSelected(person)
                } else showToast('پروندهٔ مرتبط دیگر در دسترس نیست.')
                if (owner) void markNotificationsRead(owner, [item.id]).then(result => {
                  if (notificationOwnerRef.current === owner) setNotifications(result.items)
                }).catch(cause => {
                  if (notificationOwnerRef.current === owner) setNotificationError(cause instanceof Error ? cause.message : 'ثبت وضعیت خوانده‌شدن اعلان ناموفق بود.')
                })
              }}
              onMarkRead={id => {
                const owner = sessionUsername
                if (owner) void markNotificationsRead(owner, [id]).then(result => {
                  if (notificationOwnerRef.current === owner) setNotifications(result.items)
                }).catch(cause => {
                  if (notificationOwnerRef.current === owner) setNotificationError(cause instanceof Error ? cause.message : 'ثبت وضعیت خوانده‌شدن اعلان ناموفق بود.')
                })
              }}
              onMarkAllRead={() => {
                const owner = sessionUsername
                if (owner) void markNotificationsRead(owner, [], true).then(result => {
                  if (notificationOwnerRef.current === owner) setNotifications(result.items)
                }).catch(cause => {
                  if (notificationOwnerRef.current === owner) setNotificationError(cause instanceof Error ? cause.message : 'ثبت وضعیت اعلان‌ها ناموفق بود.')
                })
              }}
            />}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden!"
              onClick={() => {
                setCalOpen(false)
                setMobileMoreOpen(false)
                setProfileOpen(true)
              }}
              title="نمایش پروفایل"
              aria-label={`نمایش پروفایل ${currentUser.name}`}
            >
              <Avatar text={currentUser.name[0] ?? 'ک'} src={currentUser.photo} size={28} />
            </Button>

            {has('view_tasks') && <Button
              type="button"
              variant="primary"
              size="sm"
              className="hidden! sm:inline-flex!"
              onClick={openTasksPage}
              title="ورود به بخش کارهای من"
            >
              کارهای من
            </Button>}
          </div>
        </header>

        {serverMessage && session && (
          <div className="mx-auto mt-3 w-full max-w-7xl px-4 sm:px-6 lg:px-8" role="alert" aria-live="assertive">
            <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800 sm:flex-row sm:items-center sm:justify-between dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              <span>{serverMessage}</span>
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => window.location.reload()}>تازه‌سازی صفحه</Button>
            </div>
          </div>
        )}
        <div className="app-mobile-page-content mx-auto w-full max-w-7xl px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-8">
          {legacySnapshot && (
            <LegacyDataMigration
              snapshot={legacySnapshot}
              canImport={legacyCanImport}
              onImport={handleLegacyImport}
              onDiscard={handleLegacyDiscard}
              onDownload={() => downloadLegacySnapshot(legacySnapshot)}
            />
          )}

          {page === 'dashboard' && has('view_dashboard') && (
            <Dashboard
              people={people}
              workflowConfig={workflowConfig}
              activities={activities}
              trend={activityTrend}
              canViewActivities={has('view_activities')}
              canViewPeople={canViewPeople}
              canCreate={canViewPeople && has('create_person')}
              onCreate={() => setCreateOpen(true)}
              onPersons={() => setPage('persons')}
              onActivities={() => setPage('activities')}
              onSelect={setSelected}
              greeting={`خوش آمدید، ${currentUser.name}`}
            />
          )}

          {page === 'persons' && has('view_persons') && (
            <Persons
              people={people}
              workflowConfig={workflowConfig}
              query={query}
              filter={filter}
              tagFilter={tagFilter}
              sortBy={sortBy}
              selfUsername={currentUser.username}
              setQuery={setQuery}
              setFilter={setFilter}
              setTagFilter={setTagFilter}
              setSortBy={setSortBy}
              canCreate={has('create_person')}
              canChange={has('change_status')}
              canDelete={has('delete_person')}
              canImportExcel={has('import_people_excel') && has('create_person')}
              canExportExcel={has('export_people_excel')}
              canExportCsv={has('export_people_csv')}
              onCreate={() => setCreateOpen(true)}
              onImportExcel={() => setExcelImportOpen(true)}
              onExportExcel={() => { void handleExportServerPeople() }}
              onSelect={setSelected}
              onBulkStatus={handleBulkStatus}
              onBulkDelete={async ids => {
                if (!has('delete_person')) { showToast('مجوز حذف گروهی پرونده را ندارید.'); return false }
                if (!window.confirm(`حذف ${ids.length} پرونده انتخاب‌شده؟`)) return false
                const deletedPeople = people.filter(person => ids.includes(person.id))
                if (!deletedPeople.length || deletedPeople.length !== new Set(ids).size) { showToast('فهرست پرونده‌های انتخاب‌شده معتبر نیست.'); return false }
                const deletedActivities: Activity[] = deletedPeople.map(person => ({
                  id: uid('ACT'),
                  personId: person.id,
                  personName: `${person.firstName} ${person.lastName}`,
                  action: 'حذف پرونده',
                  previousStatus: stageById(workflowConfig, stageIdForPerson(person, workflowConfig))?.label ?? person.status,
                  newStatus: null,
                  rejectionReason: null,
                  details: 'پرونده با حذف گروهی از سامانه حذف شد.',
                  createdAt: nowStamp(),
                  createdBy: currentUser.name,
                  createdByRole: currentUser.role,
                  ts: nowTs(),
                }))
                const auditEntry = auditLog('حذف پرونده', `حذف گروهی ${deletedPeople.length} پرونده`)
                try {
                  await commitPeopleBundle(people.filter(person => !ids.includes(person.id)), [...deletedActivities, ...activities], [auditEntry, ...audit])
                  showToast(`${deletedPeople.length} پرونده حذف شدند.`)
                  return true
                } catch (cause) {
                  showToast(cause instanceof Error ? `حذف گروهی ناموفق بود: ${cause.message}` : 'حذف گروهی ناموفق بود.')
                  return false
                }
              }}
            />
          )}

          {page === 'workflow' && has('view_workflow') && (
            <WorkflowBoard
              people={people}
              workflowConfig={workflowConfig}
              canChange={has('change_status')}
              onSelect={setSelected}
              onDropPerson={(id, st) => {
                const p = people.find(x => x.id === id)
                if (p) handleUpdateStatus(p, st, null)
              }}
            />
          )}

          {page === 'activities' && has('view_activities') && <Activities activities={activities} canExport={has('export_activities')} onExport={exportActivities} />}

          {page === 'users' && canViewUserDirectory && (
            <Users
              users={users}
              roles={roles}
              currentUser={currentUser}
              selfUsername={currentUser.username}
              canViewUsers={canViewUsers}
              canViewRoles={canViewRoles}
              canCreateUsers={canCreateUsers}
              canEditUsers={canEditUsers}
              canDeleteUsers={canDeleteUsers}
              canCreateRoles={canCreateRoles}
              canEditRoles={canEditRoles}
              canDeleteRoles={canDeleteRoles}
              canExportBackup={canExportBackup}
              canRestoreBackup={canRestoreBackup}
              canPurgeServerData={canPurgeServerData}
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
              onAddRole={() => { setEditingRole(null); setAddRoleOpen(true) }}
              onEditRole={setEditingRole}
              onDeleteRole={async r => {
                if (!window.confirm(`حذف نقش «${r.title}»؟`)) return
                const nextRoles = roles.filter(item => item.id !== r.id)
                try {
                  await syncSave('nab:roles', nextRoles)
                  setRoles(nextRoles)
                  showToast('نقش حذف شد.')
                } catch (cause) {
                  showToast(cause instanceof Error ? cause.message : 'حذف نقش ناموفق بود.')
                }
              }}
            />
          )}

          {page === 'reports' && has('view_reports') && (
            <Reports
              people={people}
              activities={activities}
              audit={audit}
              workflowConfig={workflowConfig}
              todayCount={todayActivityCount}
              canViewPeople={has('view_persons')}
              canViewActivities={has('view_activities')}
              canViewAudit={has('view_audit_log')}
              canExportPeople={has('view_persons') && has('export_people_csv')}
              canPrintReports={has('print_reports')}
              onExport={exportAllPeople}
              onPrint={() => window.print()}
            />
          )}

          {page === 'settings' && canViewSettings && currentUser && <Settings
            key={JSON.stringify(appSettings)}
            settings={appSettings}
            canManage={has('manage_settings')}
            canManageWorkflow={has('manage_workflow')}
            isSystemAdmin={currentUser.role === 'admin'}
            totpEnrolled={totpEnrolled}
            onStartTotpEnrollment={startTotpEnrollment}
            onConfirmTotpEnrollment={async code => {
              await confirmTotpEnrollment(code)
              setTotpEnrolled(true)
              showToast('برنامهٔ احراز هویت برای حساب مدیر ثبت شد.')
            }}
            onManageWorkflow={() => setWorkflowManagerOpen(true)}
            onSave={handleSaveSettings}
          />}
          {(!canOpenPage(page) || page === 'tasks') && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><b className="block">این بخش برای حساب شما در دسترس نیست.</b><span>از مدیر سامانه بخواهید مجوز صفحه یا عملیات موردنیاز را در نقش یا تنظیم اختصاصی کاربر فعال کند.</span></section>}
        </div>
      </main>

      {/* Modals */}
      {workflowManagerOpen && has('manage_workflow') && (
        <WorkflowManager
          config={workflowConfig}
          onClose={() => setWorkflowManagerOpen(false)}
          onSave={handleSaveWorkflow}
        />
      )}
      {excelImportOpen && canViewPeople && has('create_person') && has('import_people_excel') && (
        <ExcelImportModal
          workflowConfig={workflowConfig}
          onClose={() => setExcelImportOpen(false)}
          onImport={handleExcelImport}
        />
      )}
      {createOpen && has('view_persons') && has('create_person') && (
        <CreateModal
          existing={people}
          creatorName={currentUser.name}
          workflowConfig={workflowConfig}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreatePerson}
        />
      )}

      {selected && has('view_persons') && (
        <PersonModal
          person={selected}
          workflowConfig={workflowConfig}
          notes={notes.filter(n => n.personId === selected.id)}
          history={activities.filter(a => a.personId === selected.id)}
          meUsername={currentUser.username}
          usersList={users}
          canChange={has('change_status')}
          canAssign={has('assign_person')}
          canCompleteChecklist={has('complete_checklist')}
          canViewPersonNotes={has('view_person_notes')}
          canViewHistory={has('view_activities')}
          canCreateNote={has('create_person_note')}
          canEditNotes={has('edit_person_note')}
          canDeleteNotes={has('delete_person_note')}
          canManageAnyNote={has('manage_any_person_note')}
          canPrint={has('print_person')}
          canDelete={has('delete_person')}
          canEdit={has('edit_person')}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdateStatus}
          onChecklistToggle={handleChecklistToggle}
          onDelete={handleDeletePerson}
          onEdit={p => {
            setEditingPerson(p)
            setSelected(null)
          }}
          onAssign={async (p, uname) => {
            if (!has('assign_person')) { showToast('مجوز ارجاع پرونده را ندارید.'); return }
            const previousAssignee = p.assignee ?? ''
            if (previousAssignee === uname) return
            const up = { ...p, assignee: uname || undefined }
            const previousName = users.find(user => user.username === previousAssignee)?.name ?? (previousAssignee || 'بدون ارجاع')
            const nextName = users.find(user => user.username === uname)?.name ?? (uname || 'بدون ارجاع')
            const activity: Activity = {
              id: uid('ACT'), personId: p.id, personName: `${p.firstName} ${p.lastName}`,
              action: 'ارجاع پرونده', previousStatus: null, newStatus: null, rejectionReason: null,
              details: `از «${previousName}» به «${nextName}»`, createdAt: nowStamp(),
              createdBy: currentUser?.name ?? 'کاربر', createdByRole: currentUser?.role ?? 'admin', ts: nowTs(),
            }
            const auditEntry = auditLog('ارجاع پرونده', `${p.id}: از «${previousName}» به «${nextName}»`)
            try {
              const result = await commitPeopleBundle(people.map(person => person.id === p.id ? up : person), [activity, ...activities], [auditEntry, ...audit])
              setSelected(result.people.find(person => person.id === p.id) ?? up)
              showToast('پرونده با موفقیت ارجاع داده شد.')
            } catch (cause) {
              showToast(cause instanceof Error ? `ارجاع پرونده ناموفق بود: ${cause.message}` : 'ارجاع پرونده ناموفق بود.')
            }
          }}
          onAddNote={handleAddNote}
          onEditNote={handleEditNote}
          onDeleteNote={handleDeleteNote}
        />
      )}

      {editingPerson && has('view_persons') && has('edit_person') && (
        <EditModal
          person={editingPerson}
          existing={people}
          onClose={() => setEditingPerson(null)}
          onSave={handleEditPerson}
        />
      )}

      {addUserOpen && canCreateUsers && (
        <AddUserModal
          existing={users}
          roles={roles}
          allowedPermissions={currentUser.permissions}
          canAssignAdmin={currentUser.role === 'admin'}
          onClose={() => setAddUserOpen(false)}
          onCreate={async u => {
            const created = await createUserOnServer(u as unknown as Record<string, unknown>)
            setUsers(cur => [...cur, normalizeUser(created)])
            setAddUserOpen(false)
            showToast('کاربر جدید ایجاد شد.')
          }}
        />
      )}

      {editingUser && canEditUsers && (
        <EditUserModal
          user={editingUser}
          roles={roles}
          allowedPermissions={currentUser.permissions}
          canAssignAdmin={currentUser.role === 'admin'}
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

      {((addRoleOpen && canCreateRoles) || (editingRole && canEditRoles)) && (
        <RoleModal
          key={editingRole?.id ?? 'new-role'}
          existing={roles}
          role={editingRole ?? undefined}
          allowedPermissions={currentUser.permissions}
          onClose={() => { setAddRoleOpen(false); setEditingRole(null) }}
          onSave={async savedRole => {
            const nextRoles = editingRole
              ? roles.map(item => item.id === savedRole.id ? savedRole : item)
              : [...roles, savedRole]
            await syncSave('nab:roles', nextRoles)
            setRoles(nextRoles)
            if (editingRole) setUsers(current => current.map(user => user.role === savedRole.id ? { ...user, title: savedRole.title } : user))
            setAddRoleOpen(false)
            setEditingRole(null)
            showToast(editingRole ? 'مجوزهای نقش به‌روزرسانی شد.' : 'نقش جدید تعریف شد.')
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
            if (updated.security) setTotpEnrolled(updated.security.totp_enrolled)
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
            setSearchOpen(false)
            if (p === 'tasks') { openTasksPage(); return }
            if (canOpenPage(p)) setPage(p)
            else showToast('مجوز ورود به این بخش را ندارید.')
          }}
          canNavigate={canOpenPage}
          onOpenCreatePerson={canViewPeople && has('create_person') ? () => setCreateOpen(true) : undefined}
          onOpenTasks={has('view_tasks') ? openTasksPage : undefined}
          canSearchPeople={has('view_persons')}
          canSearchNotes={has('view_persons') && has('view_person_notes')}
          canSearchActivities={has('view_activities')}
          onExportData={has('view_persons') && has('export_people_csv') ? exportAllPeople : undefined}
        />
      )}

      {/* Printable Views */}
      {selected && has('print_person') && (
        <PrintPerson
          person={selected}
          notes={has('view_person_notes') ? notes.filter(n => n.personId === selected.id) : []}
          history={has('view_activities') ? activities.filter(a => a.personId === selected.id) : []}
          workflowConfig={workflowConfig}
        />
      )}

      {page === 'reports' && has('print_reports') && (
        <PrintReport people={has('view_persons') ? people : []} activities={has('view_activities') ? activities : []} printedBy={currentUser.name} workflowConfig={workflowConfig} />
      )}

      <nav aria-label="پیمایش موبایل" className="app-mobile-nav fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-stretch gap-1 border-t border-slate-200 bg-white/95 px-1.5 py-1.5 pb-[max(.375rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {mobileNavItems.map(([key]) => (
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
              setMobileMoreOpen(false)
            }}
            className={cn('flex min-h-13 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] leading-tight text-slate-500 dark:text-slate-400', page === key && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300')}
          >
            <PageIcon name={key} />
            <span className="max-w-full truncate">{compactNavLabels[key]}</span>
          </Button>
        ))}
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
            className={cn('flex min-h-13 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] leading-tight text-slate-500 dark:text-slate-400', mobileMoreOpen && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300')}
          >
            <PageIcon name="more" />
            <span>بیشتر</span>
          </Button>
          {mobileMoreOpen && (
            <div id="mobile-more-menu" className="absolute bottom-full left-0 z-50 mb-2 grid max-h-[70dvh] w-[min(19rem,calc(100vw-1rem))] grid-cols-1 gap-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              {mobileMoreItems.map(([key, label]) => (
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
                    setMobileMoreOpen(false)
                  }}
                >
                  {label}
                </Button>
              ))}
              {has('view_tasks') && <Button type="button" variant="ghost" size="sm" className="w-full justify-start" onClick={openTasksPage}>کارهای من</Button>}
            </div>
          )}
        </div>
      </nav>
      {toast && <div className="app-mobile-toast fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 z-60 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl sm:left-4 sm:right-auto sm:max-w-sm lg:bottom-6" role="status" aria-live="polite">{toast}</div>}
    </div>
  )
}
