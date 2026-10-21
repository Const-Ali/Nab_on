// Stage labels are editable by an administrator, so status values are strings at runtime.
export type Status = string

export type Page =
  | 'dashboard'
  | 'persons'
  | 'workflow'
  | 'activities'
  | 'users'
  | 'reports'
  | 'settings'
  | 'tasks'

export type Permission =
  | 'view_persons'
  | 'create_person'
  | 'edit_person'
  | 'change_status'
  | 'view_activities'
  | 'manage_users'
  | 'view_reports'
  | 'delete_person'

export type Role = string
export type RoleDef = { id: string; title: string; permissions: Permission[]; builtin?: boolean }
export type PersonFilter = Status | 'همه وضعیت‌ها' | 'ارجاع‌شده به من' | 'سررسید نزدیک'

export type Person = {
  id: string
  firstName: string
  lastName: string
  nationalId: string
  birthDate: string
  fatherName: string
  status: Status
  /** Stable workflow identifier; keeps records intact when an admin renames a stage. */
  stageId?: string
  /** Per-stage manual checklist marks, verified by the PHP API. */
  stageChecklist?: Record<string, Record<string, { done: boolean; checkedBy?: string; checkedAt?: string }>>
  updatedAt: string
  updatedBy: string
  photo?: string
  tags?: string[]
  ts?: number
  assignee?: string
  deadline?: string
}

export type Activity = {
  id: string
  personId: string
  personName: string
  action: string
  previousStatus: Status | null
  newStatus: Status | null
  rejectionReason: string | null
  createdAt: string
  createdBy: string
  createdByRole: Role
  ts?: number
}

export type Audit = {
  id: string
  action: string
  target: string
  createdAt: string
  createdBy: string
  ts?: number
}

export type User = {
  name: string
  username: string
  role: Role
  title: string
  tone: string
  /** Never populated by the API; passwords are only submitted transiently for hashing. */
  password?: string
  active: boolean
  permissions: Permission[]
  photo?: string
}

export type FontKey = 'vazir' | 'estedad' | 'samim' | 'shabnam' | 'lalezar'
export type ThemeMode = 'light' | 'dark'

export type AppSettings = {
  appName: string
  twoFactor: boolean
  auditLog: boolean
  autoLogout: boolean
  autoLogoutMins: number
  font: FontKey
  theme?: ThemeMode
  soundEnabled?: boolean
  notificationsEnabled?: boolean
}

export type Note = {
  id: string
  personId: string
  author: string
  authorUsername?: string
  role: Role
  title: string
  text: string
  createdAt: string
  ts?: number
  edited?: boolean
  editedAt?: string
  editedAtTs?: number
  editedBy?: string
  editedByUsername?: string
  replyTo?: { author: string; text: string }
  mentions?: string[]
}
