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
  | 'documents'

export type Permission =
  | 'view_dashboard'
  | 'view_persons'
  | 'create_person'
  | 'edit_person'
  | 'delete_person'
  | 'change_status'
  | 'assign_person'
  | 'complete_checklist'
  | 'view_person_notes'
  | 'create_person_note'
  | 'edit_person_note'
  | 'delete_person_note'
  | 'manage_any_person_note'
  | 'print_person'
  | 'export_people_csv'
  | 'export_people_excel'
  | 'import_people_excel'
  | 'view_workflow'
  | 'manage_workflow'
  | 'view_activities'
  | 'export_activities'
  | 'view_reports'
  | 'print_reports'
  | 'view_audit_log'
  | 'view_users'
  | 'create_user'
  | 'edit_user'
  | 'delete_user'
  | 'manage_users'
  | 'view_roles'
  | 'create_role'
  | 'edit_role'
  | 'delete_role'
  | 'manage_roles'
  | 'export_backup'
  | 'restore_backup'
  | 'purge_server_data'
  | 'view_settings'
  | 'manage_settings'
  | 'view_tasks'
  | 'create_task'
  | 'edit_task'
  | 'change_task_status'
  | 'delete_task'
  | 'view_documents'
  | 'create_document'
  | 'edit_document'
  | 'change_document_stage'
  | 'delete_document'
  | 'export_documents'
  | 'manage_document_workflow'

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
  /** Server timestamp recorded whenever the current workflow stage changes. */
  stageEnteredAt?: string
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
  /** Human-readable case-operation details, separate from rejection reasons. */
  details?: string
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

export type AppNotification = {
  id: string
  kind: 'assignment' | 'deadline' | 'stalled'
  title: string
  body: string
  personId: string
  createdAt: string
  ts: number
  readAt: string | null
}

export type PeopleImportRow = {
  firstName: string
  lastName: string
  nationalId: string
  birthDate: string
  fatherName: string
  deadline: string
  assignee: string
}

export type ServerPersonExportRow = Pick<Person,
  'id' | 'firstName' | 'lastName' | 'nationalId' | 'birthDate' | 'fatherName' | 'status' | 'stageId' | 'deadline' | 'assignee'
>

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
