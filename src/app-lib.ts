import { jalaliJdn, jalaliMonthNames, jalaliParts, jalaliToday, load, normalizeDigits, timestampToMs } from './shared'
import { validJalaliDate } from './tasks/utils'
import type { Status, Permission, Role, RoleDef, Person, Activity, Audit, User, AppSettings, Note, FontKey } from './types'
import { activeStages, defaultWorkflowConfig, stageById, stageIdForPerson } from './workflow'
import type { WorkflowConfig } from './workflow'

export const workflow: Status[] = ['درخواست پرونده', 'پرونده پرسنلی', 'کارت عادی', 'سه‌برگی عادی', 'تکمیل اطلاعات', 'پرونده فعال', 'ارسال به مرکز', 'بررسی مرکز', 'تأیید شده', 'رد شده', 'ارسال به شرکت', 'پایان کار']

export const nextStatuses: Partial<Record<Status, Status[]>> = {
  'درخواست پرونده': ['پرونده پرسنلی'],
  'پرونده پرسنلی': ['کارت عادی'],
  'کارت عادی': ['سه‌برگی عادی'],
  'سه‌برگی عادی': ['تکمیل اطلاعات'],
  'تکمیل اطلاعات': ['پرونده فعال'],
  'پرونده فعال': ['ارسال به مرکز'],
  'ارسال به مرکز': ['بررسی مرکز'],
  'بررسی مرکز': ['تأیید شده', 'رد شده'],
  'تأیید شده': ['ارسال به شرکت'],
  'رد شده': ['تکمیل اطلاعات'],
  'ارسال به شرکت': ['پایان کار'],
}

export const tones: Record<Status, string> = {
  'درخواست پرونده': 'blue',
  'پرونده پرسنلی': 'indigo',
  'کارت عادی': 'purple',
  'سه‌برگی عادی': 'purple',
  'تکمیل اطلاعات': 'amber',
  'پرونده فعال': 'green',
  'ارسال به مرکز': 'cyan',
  'بررسی مرکز': 'orange',
  'تأیید شده': 'green',
  'رد شده': 'red',
  'ارسال به شرکت': 'pink',
  'پایان کار': 'slate',
}

export const personTags: Record<string, string> = { 'فوری': 'red', 'مهم': 'amber', 'VIP': 'purple', 'پیگیری': 'blue' }

export const deadlineLeft = (p: Person, config: WorkflowConfig = defaultWorkflowConfig): number | null => {
  const stage = stageById(config, stageIdForPerson(p, config))
  if (!p.deadline || stage?.isFinal || ['approved', 'rejected'].includes(stage?.id ?? '')) return null
  const dl = normalizeDigits(p.deadline.trim())
  if (!validJalaliDate(dl)) return null
  const m = dl.match(/^(\d{3,4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const tj = jalaliParts(new Date())
  return jalaliJdn(Number(m[1]), Number(m[2]), Number(m[3])) - jalaliJdn(tj.y, tj.m, tj.d)
}

export const staleDays = (p: Person, config: WorkflowConfig = defaultWorkflowConfig) => {
  const stage = stageById(config, stageIdForPerson(p, config))
  const enteredAt = p.stageEnteredAt ? Date.parse(p.stageEnteredAt) : Number.NaN
  const timestamp = Number.isFinite(enteredAt) && enteredAt > 0
    ? enteredAt
    : timestampToMs(p.ts) ?? (p.updatedAt ? Date.parse(p.updatedAt) : 0)
  return (!Number.isFinite(timestamp) || timestamp <= 0 || stage?.isFinal) ? 0 : Math.max(0, Math.floor((Date.now() - timestamp) / 86400000))
}

export const seedNames = [
  ['علی', 'رضایی', 'محمد'],
  ['سارا', 'احمدی', 'حسن'],
  ['محمد', 'کریمی', 'علی'],
  ['نگار', 'موسوی', 'رضا'],
  ['امیر', 'حسینی', 'کاظم'],
  ['مریم', 'اکبری', 'جواد'],
  ['رضا', 'مرادی', 'احمد'],
  ['نیلوفر', 'قاسمی', 'حسین'],
  ['مهدی', 'صادقی', 'علی'],
  ['پریسا', 'یوسفی', 'محمود'],
  ['حامد', 'نوری', 'حسن'],
  ['الهام', 'شریفی', 'رضا'],
  ['سینا', 'طاهری', 'کریم'],
  ['فاطمه', 'نعمتی', 'محمد'],
  ['یاسر', 'رستمی', 'اکبر'],
  ['مهسا', 'کاظمی', 'حسین'],
  ['آرمان', 'مهدوی', 'رضا'],
  ['سمیه', 'رحیمی', 'علی'],
  ['نوید', 'حیدری', 'مسعود'],
  ['آتنا', 'جعفری', 'حسن'],
] as const

const makeValidNationalId = (idx: number) => {
  const base = ('0012345' + String(idx).padStart(2, '0')).slice(0, 9)
  const sum = base.split('').reduce((n, d, i) => n + Number(d) * (10 - i), 0) % 11
  const check = sum < 2 ? sum : 11 - sum
  return base + check
}

const nowMillis = Date.now()

export const initialPeople: Person[] = seedNames.map(([firstName, lastName, fatherName], i) => {
  const pastDays = (20 - i) * 2
  const itemTs = nowMillis - pastDays * 86400000
  return {
    id: `P-${14001 + i}`,
    firstName,
    lastName,
    fatherName,
    nationalId: makeValidNationalId(i),
    birthDate: `137${i % 10}/${String(i % 12 + 1).padStart(2, '0')}/${String(i % 27 + 1).padStart(2, '0')}`,
    status: workflow[i % workflow.length],
    updatedAt: `${Math.max(1, (i + 1) % 30)} شهریور ۱۴۰۵`,
    updatedBy: i % 2 ? 'مریم رضایی' : 'احمد محمدی',
    deadline: i === 3 ? '1405/06/14' : i === 8 ? '1405/06/18' : i === 15 ? '1405/09/01' : undefined,
    ts: itemTs,
    assignee: i % 3 === 0 ? 'assistant' : i % 3 === 1 ? 'admin' : undefined,
    tags: i % 4 === 0 ? ['فوری'] : i % 5 === 0 ? ['VIP'] : i % 3 === 0 ? ['مهم'] : undefined,
  }
})

export const initialActivities: Activity[] = initialPeople.map((p, i) => {
  const pastDays = (20 - i) * 2
  const itemTs = nowMillis - pastDays * 86400000
  return {
    id: `ACT-${i}`,
    personId: p.id,
    personName: `${p.firstName} ${p.lastName}`,
    action: i % 2 ? 'ایجاد پرونده جدید' : 'تغییر وضعیت پرونده',
    previousStatus: i % 2 ? null : workflow[(i - 1 + workflow.length) % workflow.length],
    newStatus: p.status,
    rejectionReason: p.status === 'رد شده' ? 'نقص اطلاعات' : null,
    createdAt: `${p.updatedAt} · ۱۴:۳۲`,
    createdBy: p.updatedBy,
    createdByRole: p.updatedBy === 'احمد محمدی' ? 'admin' : 'assistant',
    ts: itemTs,
  }
})

export const initialAudit: Audit[] = [
  { id: 'AUD-1', action: 'ورود به سامانه', target: 'مدیر سیستم', createdAt: '۱۶ شهریور ۱۴۰۵ · ۰۸:۴۵', createdBy: 'احمد محمدی' },
]

export const initialUsers: User[] = []

export const initialNotes: Note[] = [
  { id: 'NOTE-1', personId: 'P-14001', author: 'مریم رضایی', role: 'assistant', title: 'کارشناس پرونده', text: 'مدارک هویتی بررسی شد؛ در انتظار تکمیل اطلاعات بیمه‌ای.', createdAt: '۱۴ شهریور ۱۴۰۵ · ۱۰:۱۵' },
  { id: 'NOTE-2', personId: 'P-14001', author: 'احمد محمدی', role: 'admin', title: 'مدیر سیستم', text: 'ممنون. بعد از تکمیل اطلاعات دوباره به من اطلاع بدهید.', createdAt: '۱۴ شهریور ۱۴۰۵ · ۱۱:۰۲' },
]

export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    'view_dashboard', 'view_persons', 'create_person', 'edit_person', 'delete_person',
    'change_status', 'assign_person', 'complete_checklist', 'view_person_notes',
    'create_person_note', 'edit_person_note', 'delete_person_note', 'manage_any_person_note',
    'print_person', 'export_people_csv', 'export_people_excel', 'import_people_excel',
    'view_workflow', 'manage_workflow', 'view_activities', 'export_activities',
    'view_reports', 'print_reports', 'view_audit_log', 'view_users', 'create_user', 'edit_user', 'delete_user', 'manage_users',
    'view_roles', 'create_role', 'edit_role', 'delete_role', 'manage_roles', 'export_backup', 'restore_backup', 'purge_server_data', 'view_settings', 'manage_settings', 'view_tasks', 'create_task', 'edit_task', 'change_task_status', 'delete_task',
  ],
  assistant: [
    'view_dashboard', 'view_persons', 'create_person', 'edit_person',
    'view_person_notes', 'create_person_note', 'edit_person_note', 'delete_person_note',
    'print_person', 'view_workflow', 'view_settings', 'manage_settings', 'view_tasks', 'create_task', 'edit_task', 'change_task_status', 'delete_task',
  ],
  reviewer: [
    'view_dashboard', 'view_persons', 'change_status', 'assign_person', 'complete_checklist',
    'view_activities', 'view_person_notes', 'create_person_note', 'edit_person_note',
    'delete_person_note', 'print_person', 'view_workflow', 'view_settings',
    'manage_settings', 'view_tasks', 'create_task', 'edit_task', 'change_task_status', 'delete_task',
  ],
}

export const permissionLabels: Record<Permission, string> = {
  view_dashboard: 'مشاهدهٔ داشبورد',
  view_persons: 'مشاهدهٔ پرونده‌ها',
  create_person: 'ایجاد پرونده',
  edit_person: 'ویرایش اطلاعات پرونده',
  delete_person: 'حذف پرونده (تکی و گروهی)',
  change_status: 'تغییر مرحلهٔ پرونده',
  assign_person: 'ارجاع پرونده به کاربر',
  complete_checklist: 'تکمیل چک‌لیست مرحله',
  view_person_notes: 'مشاهدهٔ گفتگو و یادداشت پرونده',
  create_person_note: 'ثبت یادداشت پرونده',
  edit_person_note: 'ویرایش یادداشت‌های خود',
  delete_person_note: 'حذف یادداشت‌های خود',
  manage_any_person_note: 'مدیریت یادداشت دیگران (نیازمند مجوز ویرایش/حذف)',
  print_person: 'چاپ پرونده',
  export_people_csv: 'خروجی CSV پرونده‌ها',
  export_people_excel: 'دریافت Excel پرونده‌ها از سرور',
  import_people_excel: 'ورود گروهی پرونده‌ها از Excel',
  view_workflow: 'مشاهدهٔ برد گردش‌کار',
  manage_workflow: 'مدیریت تعریف گردش‌کار',
  view_activities: 'مشاهدهٔ رویدادها و تاریخچه',
  export_activities: 'خروجی رویدادها',
  view_reports: 'مشاهدهٔ گزارش‌ها و تحلیل',
  print_reports: 'چاپ گزارش‌ها',
  view_audit_log: 'مشاهدهٔ رخدادهای امنیتی (Audit)',
  view_users: 'مشاهدهٔ فهرست حساب‌های کاربری',
  create_user: 'ایجاد حساب کاربری',
  edit_user: 'ویرایش حساب و مجوزهای کاربر',
  delete_user: 'حذف حساب کاربری',
  manage_users: 'مدیریت کامل حساب‌های کاربری (همهٔ عملیات)',
  view_roles: 'مشاهدهٔ نقش‌ها',
  create_role: 'ایجاد نقش سازمانی',
  edit_role: 'ویرایش مجوزها و عنوان نقش',
  delete_role: 'حذف نقش سازمانی',
  manage_roles: 'مدیریت کامل نقش‌ها (همهٔ عملیات)',
  export_backup: 'استخراج بکاپ رمزگذاری‌شده از کل سامانه',
  restore_backup: 'بازیابی بکاپ کامل و جایگزینی داده‌های سامانه',
  purge_server_data: 'پاکسازی کامل داده‌های عملیاتی سرور (فقط مدیر سیستم)',
  view_settings: 'مشاهدهٔ تنظیمات سامانه',
  manage_settings: 'ویرایش و ذخیرهٔ تنظیمات سامانه',
  view_tasks: 'مشاهدهٔ کارهای من',
  create_task: 'ایجاد کار',
  edit_task: 'ویرایش جزئیات کار',
  change_task_status: 'تغییر وضعیت و تکمیل/بازگشایی کار',
  delete_task: 'حذف کار',
}

export const permissionGroups: { title: string; permissions: Permission[] }[] = [
  { title: 'صفحات و مشاهده', permissions: ['view_dashboard', 'view_persons', 'view_workflow', 'view_activities', 'view_reports', 'view_audit_log', 'view_users', 'view_settings', 'view_tasks'] },
  { title: 'پرونده‌ها و گردش‌کار', permissions: ['create_person', 'edit_person', 'delete_person', 'change_status', 'assign_person', 'complete_checklist', 'manage_workflow'] },
  { title: 'گفتگو و یادداشت پرونده', permissions: ['view_person_notes', 'create_person_note', 'edit_person_note', 'delete_person_note', 'manage_any_person_note'] },
  { title: 'چاپ و خروجی / ورود', permissions: ['print_person', 'export_people_csv', 'export_people_excel', 'import_people_excel', 'export_activities', 'print_reports'] },
  { title: 'مدیریت حساب‌های کاربری', permissions: ['create_user', 'edit_user', 'delete_user', 'manage_users'] },
  { title: 'مدیریت نقش‌ها', permissions: ['view_roles', 'create_role', 'edit_role', 'delete_role', 'manage_roles'] },
  { title: 'پشتیبان‌گیری و پاکسازی سامانه', permissions: ['export_backup', 'restore_backup', 'purge_server_data'] },
  { title: 'تنظیمات سامانه', permissions: ['manage_settings'] },
  { title: 'کارهای من', permissions: ['create_task', 'edit_task', 'change_task_status', 'delete_task'] },
]

export const defaultRoles: RoleDef[] = [
  { id: 'admin', title: 'مدیر سیستم', permissions: [...rolePermissions.admin], builtin: true },
  { id: 'assistant', title: 'کارشناس پرونده', permissions: [...rolePermissions.assistant], builtin: true },
  { id: 'reviewer', title: 'کارشناس مرکز', permissions: [...rolePermissions.reviewer], builtin: true },
]

export const allPermissions = Object.keys(permissionLabels) as Permission[]

export function canGrantPermission(allowedPermissions: Permission[], permission: Permission): boolean {
  if (allowedPermissions.includes(permission)) return true
  const delegatedBy: Partial<Record<Permission, Permission>> = {
    view_users: 'manage_users',
    create_user: 'manage_users',
    edit_user: 'manage_users',
    delete_user: 'manage_users',
    view_roles: 'manage_roles',
    create_role: 'manage_roles',
    edit_role: 'manage_roles',
    delete_role: 'manage_roles',
  }
  const parent = delegatedBy[permission]
  return parent ? allowedPermissions.includes(parent) : false
}

export function permissionDependencyError(permissions: readonly Permission[]): string | null {
  const selected = new Set(permissions)
  const personOperations: Permission[] = [
    'create_person', 'edit_person', 'delete_person', 'change_status', 'assign_person',
    'complete_checklist', 'view_person_notes', 'create_person_note', 'edit_person_note',
    'delete_person_note', 'manage_any_person_note', 'print_person', 'export_people_csv',
    'export_people_excel', 'import_people_excel',
  ]
  if (personOperations.some(permission => selected.has(permission)) && !selected.has('view_persons')) return 'عملیات پرونده به مجوز «مشاهدهٔ پرونده‌ها» نیز نیاز دارد.'
  if (selected.has('import_people_excel') && !selected.has('create_person')) return 'ورود Excel به مجوز «ایجاد پرونده» نیز نیاز دارد.'
  if (selected.has('create_person_note') && !selected.has('view_person_notes')) return 'ثبت یادداشت به مجوز «مشاهدهٔ گفتگو و یادداشت» نیز نیاز دارد.'
  if (selected.has('edit_person_note') && !selected.has('view_person_notes')) return 'ویرایش یادداشت به مجوز «مشاهدهٔ گفتگو و یادداشت» نیز نیاز دارد.'
  if (selected.has('delete_person_note') && !selected.has('view_person_notes')) return 'حذف یادداشت به مجوز «مشاهدهٔ گفتگو و یادداشت» نیز نیاز دارد.'
  if (selected.has('manage_any_person_note') && (!selected.has('view_person_notes') || (!selected.has('edit_person_note') && !selected.has('delete_person_note')))) return 'مدیریت یادداشت دیگران به مشاهدهٔ یادداشت و دست‌کم یکی از مجوزهای ویرایش/حذف نیاز دارد.'
  if (selected.has('export_activities') && !selected.has('view_activities')) return 'خروجی رویدادها به مجوز «مشاهدهٔ رویدادها» نیز نیاز دارد.'
  if (selected.has('print_reports') && !selected.has('view_reports')) return 'چاپ گزارش به مجوز «مشاهدهٔ گزارش‌ها» نیز نیاز دارد.'
  if (['create_task', 'edit_task', 'change_task_status', 'delete_task'].some(permission => selected.has(permission as Permission)) && !selected.has('view_tasks')) return 'عملیات کارها به مجوز «مشاهدهٔ کارهای من» نیز نیاز دارد.'
  if (['create_user', 'edit_user', 'delete_user'].some(permission => selected.has(permission as Permission)) && !selected.has('view_users')) return 'مدیریت حساب‌ها به مجوز «مشاهدهٔ فهرست حساب‌های کاربری» نیز نیاز دارد.'
  if (['create_role', 'edit_role', 'delete_role'].some(permission => selected.has(permission as Permission)) && !selected.has('view_roles')) return 'مدیریت نقش‌ها به مجوز «مشاهدهٔ نقش‌ها» نیز نیاز دارد.'
  return null
}
export const defaultSettings: AppSettings = { appName: 'سامانه مدیریت پرونده ناب', twoFactor: false, auditLog: true, autoLogout: false, autoLogoutMins: 30, font: 'vazir' }

export const userByRole: Record<Role, { name: string; title: string }> = {
  admin: { name: 'احمد محمدی', title: 'مدیر سیستم' },
  assistant: { name: 'مریم رضایی', title: 'کارشناس پرونده' },
  reviewer: { name: 'محمد رضایی', title: 'کارشناس مرکز' },
}

export const getUserTitle = (role: Role, roles: RoleDef[] = defaultRoles): string => {
  return userByRole[role]?.title ?? roles.find(r => r.id === role)?.title ?? role
}

export const getUserName = (role: Role): string => {
  return userByRole[role]?.name ?? 'کاربر'
}

export const fontStacks: Record<FontKey, string> = {
  vazir: "'Vazirmatn'",
  estedad: "'Estedad'",
  samim: "'Samim'",
  shabnam: "'Shabnam'",
  lalezar: "'Lalezar'",
}

export const fontOptions: { key: FontKey; label: string; hint: string }[] = [
  { key: 'vazir', label: 'وزیرمتن', hint: 'مدرن و خوانا — پیش‌فرض' },
  { key: 'estedad', label: 'استعداد', hint: 'هندسی و خوش‌فرم' },
  { key: 'samim', label: 'سمیم', hint: 'کلاسیک و محتاطانه' },
  { key: 'shabnam', label: 'شبنم', hint: 'ساده و سبک' },
  { key: 'lalezar', label: 'لاله‌زار', hint: 'تیتری و جذاب' },
]

export const applyFont = (font: FontKey) => {
  document.documentElement.style.setProperty('--font-main', fontStacks[font] ?? fontStacks.vazir)
}

export const applySavedFont = () => {
  const { font } = { ...defaultSettings, ...load('nab:settings', defaultSettings) }
  applyFont(font)
}

export const normalizeUser = (raw: unknown): User => {
  const u = (raw ?? {}) as Partial<User>
  const role: Role = typeof u.role === 'string' && u.role ? u.role : 'assistant'
  const username = typeof u.username === 'string' && u.username ? u.username : 'user'
  return {
    name: u.name ?? username,
    username,
    role,
    title: u.title ?? userByRole[role]?.title ?? role,
    tone: u.tone ?? 'blue',
    active: typeof u.active === 'boolean' ? u.active : true,
    permissions: Array.isArray(u.permissions) ? (u.permissions as Permission[]) : [...(rolePermissions[role] ?? [])],
  }
}

export const validNationalId = (value: string) => {
  const clean = normalizeDigits(value.trim())
  if (!/^\d{10}$/.test(clean) || /^(\d)\1{9}$/.test(clean)) return false
  const sum = clean.slice(0, 9).split('').reduce((n, d, i) => n + Number(d) * (10 - i), 0) % 11
  const check = Number(clean[9])
  return check === (sum < 2 ? sum : 11 - sum)
}

export const activityMonth = (a: Activity) => {
  const timestamp = timestampToMs(a.ts)
  if (timestamp) {
    const j = jalaliParts(new Date(timestamp))
    return { y: j.y, m: j.m }
  }
  const parts = normalizeDigits(a.createdAt).split(' ')
  const monthIdx = jalaliMonthNames.indexOf(parts[1] ?? '')
  return monthIdx >= 0 ? { y: Number(parts[2]) || 0, m: monthIdx + 1 } : null
}

type UserStat = { total: number; creates: number; changes: number; notes: number }

export const computeUserStats = (acts: Activity[]): [string, UserStat][] => {
  const map = new Map<string, UserStat>()
  for (const a of acts) {
    const s = map.get(a.createdBy) ?? { total: 0, creates: 0, changes: 0, notes: 0 }
    s.total += 1
    if (a.action === 'ایجاد پرونده جدید') s.creates += 1
    else if (a.action === 'ثبت یادداشت') s.notes += 1
    else s.changes += 1
    map.set(a.createdBy, s)
  }
  return [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5)
}

export const computeBottlenecks = (acts: Activity[], config: WorkflowConfig = defaultWorkflowConfig): { status: Status; label: string; count: number }[] => {
  const byPerson = new Map<string, Activity[]>()
  for (const a of acts) {
    if (a.ts && a.newStatus) {
      const arr = byPerson.get(a.personId) ?? []
      arr.push(a)
      byPerson.set(a.personId, arr)
    }
  }
  const acc = new Map<string, { sum: number; count: number }>()
  for (const arr of byPerson.values()) {
    arr.sort((x, y) => (x.ts ?? 0) - (y.ts ?? 0))
    for (let i = 0; i < arr.length - 1; i++) {
      const cur = arr[i]
      const next = arr[i + 1]
      if (!cur.newStatus) continue
      const e = acc.get(cur.newStatus) ?? { sum: 0, count: 0 }
      e.sum += (next.ts ?? 0) - (cur.ts ?? 0)
      e.count += 1
      acc.set(cur.newStatus, e)
    }
  }
  return activeStages(config).map(stage => {
    const s = stage.label
    const e = acc.get(s)
    if (!e || !e.count) return { status: s, label: '—', count: 0 }
    const days = e.sum / e.count / 86400000
    const label = days >= 1 ? `${Math.round(days).toLocaleString('fa-IR')} روز` : `${Math.max(1, Math.round(days * 24)).toLocaleString('fa-IR')} ساعت`
    return { status: s, label, count: e.count }
  })
}

export const rangeDefs: [string, number, string][] = [
  ['day', 1, 'امروز'],
  ['week', 7, '۷ روز گذشته'],
  ['month', 30, '۳۰ روز گذشته'],
  ['season', 90, '۹۰ روز گذشته'],
]

const parseJalaliDate = (value: string) => {
  const clean = normalizeDigits(value.trim())
  const match = clean.match(/^(13|14)\d{2}\/(\d{1,2})\/(\d{1,2})$/)
  if (!match) return null
  const year = Number(clean.slice(0, 4))
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1) return null
  const first = jalaliJdn(year, month, 1)
  const next = month === 12 ? jalaliJdn(year + 1, 1, 1) : jalaliJdn(year, month + 1, 1)
  if (day > next - first) return null
  return { year, month, day, jdn: jalaliJdn(year, month, day) }
}

export const validJalaliFormat = (value: string) => parseJalaliDate(value) !== null

export const validBirthDate = (value: string) => {
  const date = parseJalaliDate(value)
  const today = parseJalaliDate(jalaliToday())
  return Boolean(date && today && date.jdn <= today.jdn)
}

export const validDeadlineDate = (value: string) => parseJalaliDate(value) !== null

export function buildMonthlyActivityTrend(activities: Activity[], now = new Date()) {
  const current = jalaliParts(now)
  const periods = Array.from({ length: 6 }, (_, index) => {
    const rawMonth = current.m - 5 + index
    const year = current.y + Math.floor((rawMonth - 1) / 12)
    const month = (((rawMonth - 1) % 12) + 12) % 12 + 1
    return { year, month, key: `${year}-${month}` }
  })
  const counts = new Map(periods.map(period => [period.key, 0]))

  for (const activity of activities) {
    let period: { year: number; month: number } | null = null
    if (typeof activity.ts === 'number' && Number.isFinite(activity.ts) && activity.ts > 0) {
      const timestamp = activity.ts < 100_000_000_000 ? activity.ts * 1000 : activity.ts
      const date = new Date(timestamp)
      if (!Number.isNaN(date.getTime())) {
        const parts = jalaliParts(date)
        period = { year: parts.y, month: parts.m }
      }
    }
    if (!period) {
      const dateText = normalizeDigits(String(activity.createdAt ?? '').split(/[·•,،]/u)[0].trim())
      const match = dateText.match(/^(\d{3,4})[/-](\d{1,2})[/-](\d{1,2})$/)
      if (match) {
        const year = Number(match[1])
        const month = Number(match[2])
        const day = Number(match[3])
        if (year >= 1300 && year <= 1600 && validJalaliDate(`${year}/${month}/${day}`)) {
          period = { year, month }
        } else if (year >= 1900 && year <= 2200 && month >= 1 && month <= 12 && day >= 1) {
          const date = new Date(year, month - 1, day, 12)
          if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            const parts = jalaliParts(date)
            period = { year: parts.y, month: parts.m }
          }
        }
      } else {
        const namedMatch = dateText.match(/^(\d{1,2})\s+(.+?)\s+(\d{3,4})$/u)
        if (namedMatch) {
          const day = Number(namedMatch[1])
          const month = jalaliMonthNames.indexOf(namedMatch[2].trim() as typeof jalaliMonthNames[number]) + 1
          const year = Number(namedMatch[3])
          if (month > 0 && validJalaliDate(`${year}/${month}/${day}`)) period = { year, month }
        }
      }
    }
    if (period) {
      const key = `${period.year}-${period.month}`
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return {
    labels: periods.map(period => jalaliMonthNames[period.month - 1]),
    fullLabels: periods.map(period => `${jalaliMonthNames[period.month - 1]} ${period.year.toLocaleString('fa-IR')}`),
    values: periods.map(period => counts.get(period.key) ?? 0),
  }
}

export const downloadCsv = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]) => {
  const csvCell = (cell: string | number | null | undefined) => {
    let value = String(cell ?? '')
    // Prefix formula-like cells to prevent spreadsheet formula injection on open.
    let firstSignificant = 0
    while (firstSignificant < value.length && value.charCodeAt(firstSignificant) <= 0x20) firstSignificant += 1
    if ('=+@-'.includes(value[firstSignificant] ?? '\0')) value = `'${value}`
    return `"${value.replace(/"/g, '""')}"`
  }
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const imageToDataUrl = (file: File, max = 160): Promise<string> => new Promise((resolve, reject) => {
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
    URL.revokeObjectURL(url)
    resolve(canvas.toDataURL('image/jpeg', 0.85))
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    reject(new Error('bad-image'))
  }
  img.src = url
})

export const timelineTone = (a: Activity) =>
  a.action === 'رد پرونده' || a.newStatus === 'رد شده'
    ? 'red'
    : a.action.startsWith('ایجاد') || a.newStatus === 'تأیید شده'
      ? 'green'
      : a.action.includes('یادداشت')
        ? 'purple'
        : a.action.includes('ویرایش')
          ? 'amber'
          : 'blue'
