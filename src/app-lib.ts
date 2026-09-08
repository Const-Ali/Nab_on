import { jalaliJdn, jalaliMonthNames, jalaliParts, jalaliToday, load, normalizeDigits } from './shared'
import { validJalaliDate } from './tasks/utils'
import type { Status, Permission, Role, RoleDef, Person, Activity, Audit, User, AppSettings, Note, FontKey } from './types'

export const workflow: Status[] = ['درخواست پرونده', 'پرونده پرسنلی', 'کارت عادی', 'سه‌برگی عادی', 'تکمیل اطلاعات', 'پرونده فعال', 'ارسال به مرکز', 'بررسی مرکز', 'تأیید شده', 'رد شده', 'ارسال به شرکت', 'پایان کار']
export const nextStatuses: Partial<Record<Status, Status[]>> = {
  'درخواست پرونده': ['پرونده پرسنلی'], 'پرونده پرسنلی': ['کارت عادی'], 'کارت عادی': ['سه‌برگی عادی'], 'سه‌برگی عادی': ['تکمیل اطلاعات'],
  'تکمیل اطلاعات': ['پرونده فعال'], 'پرونده فعال': ['ارسال به مرکز'], 'ارسال به مرکز': ['بررسی مرکز'],
  'بررسی مرکز': ['تأیید شده', 'رد شده'], 'تأیید شده': ['ارسال به شرکت'], 'رد شده': ['تکمیل اطلاعات'], 'ارسال به شرکت': ['پایان کار'],
}
export const tones: Record<Status, string> = { 'درخواست پرونده': 'blue', 'پرونده پرسنلی': 'indigo', 'کارت عادی': 'purple', 'سه‌برگی عادی': 'purple', 'تکمیل اطلاعات': 'amber', 'پرونده فعال': 'green', 'ارسال به مرکز': 'cyan', 'بررسی مرکز': 'orange', 'تأیید شده': 'green', 'رد شده': 'red', 'ارسال به شرکت': 'pink', 'پایان کار': 'slate' }
export const personTags: Record<string, string> = { 'فوری': 'red', 'مهم': 'amber', 'VIP': 'purple', 'پیگیری': 'blue' }
export const STALE_LIMIT = 7
export const deadlineLeft = (p: Person): number | null => {
  if (!p.deadline || p.status === 'پایان کار' || p.status === 'رد شده' || p.status === 'تأیید شده') return null
  if (!validJalaliDate(p.deadline)) return null
  const m = p.deadline.match(/^(\d{3,4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const tj = jalaliParts(new Date())
  return jalaliJdn(Number(m[1]), Number(m[2]), Number(m[3])) - jalaliJdn(tj.y, tj.m, tj.d)
}
export const PAGE_SIZE = 20
export const staleDays = (p: Person) => (!p.ts || p.status === 'پایان کار' || p.status === 'تأیید شده') ? 0 : Math.floor((Date.now() - p.ts) / 86400000)
export const seedNames = [['علی', 'رضایی', 'محمد'], ['سارا', 'احمدی', 'حسن'], ['محمد', 'کریمی', 'علی'], ['نگار', 'موسوی', 'رضا'], ['امیر', 'حسینی', 'کاظم'], ['مریم', 'اکبری', 'جواد'], ['رضا', 'مرادی', 'احمد'], ['نیلوفر', 'قاسمی', 'حسین'], ['مهدی', 'صادقی', 'علی'], ['پریسا', 'یوسفی', 'محمود'], ['حامد', 'نوری', 'حسن'], ['الهام', 'شریفی', 'رضا'], ['سینا', 'طاهری', 'کریم'], ['فاطمه', 'نعمتی', 'محمد'], ['یاسر', 'رستمی', 'اکبر'], ['مهسا', 'کاظمی', 'حسین'], ['آرمان', 'مهدوی', 'رضا'], ['سمیه', 'رحیمی', 'علی'], ['نوید', 'حیدری', 'مسعود'], ['آتنا', 'جعفری', 'حسن']] as const
export const initialPeople: Person[] = seedNames.map(([firstName, lastName, fatherName], i) => ({ id: `P-${14001 + i}`, firstName, lastName, fatherName, nationalId: `0012345${String(i).padStart(3, '0')}`, birthDate: `137${i % 10}/${String(i % 12 + 1).padStart(2, '0')}/${String(i % 27 + 1).padStart(2, '0')}`, status: workflow[i % workflow.length], updatedAt: `${i + 1} شهریور ۱۴۰۵`, updatedBy: i % 2 ? 'مریم رضایی' : 'احمد محمدی', deadline: i === 3 ? '1405/06/14' : i === 8 ? '1405/06/18' : i === 15 ? '1405/09/01' : undefined }))
export const initialActivities: Activity[] = initialPeople.map((p, i) => ({ id: `ACT-${i}`, personId: p.id, personName: `${p.firstName} ${p.lastName}`, action: i % 2 ? 'ایجاد پرونده جدید' : 'تغییر وضعیت پرونده', previousStatus: null, newStatus: p.status, rejectionReason: p.status === 'رد شده' ? 'نقص اطلاعات' : null, createdAt: `${p.updatedAt} · ۱۴:۳۲`, createdBy: p.updatedBy, createdByRole: p.updatedBy === 'احمد محمدی' ? 'admin' : 'assistant' }))
export const initialAudit: Audit[] = [{ id: 'AUD-1', action: 'ورود به سامانه', target: 'مدیر سیستم', createdAt: '۱۶ شهریور ۱۴۰۵ · ۰۸:۴۵', createdBy: 'احمد محمدی' }]
export const initialUsers: User[] = [
  { name: 'احمد محمدی', username: 'admin', role: 'admin', title: 'مدیر سیستم', tone: 'green', password: 'admin', active: true, permissions: ['view_persons', 'create_person', 'edit_person', 'change_status', 'view_activities', 'manage_users', 'view_reports', 'delete_person'] },
  { name: 'مریم رضایی', username: 'assistant', role: 'assistant', title: 'کارشناس پرونده', tone: 'blue', password: 'assistant', active: true, permissions: ['view_persons', 'create_person', 'edit_person'] },
  { name: 'محمد رضایی', username: 'reviewer', role: 'reviewer', title: 'کارشناس مرکز', tone: 'purple', password: 'reviewer', active: true, permissions: ['view_persons', 'change_status', 'view_activities'] },
  { name: 'سارا کریمی', username: 'operator', role: 'assistant', title: 'اپراتور', tone: 'orange', password: '1234', active: false, permissions: ['view_persons'] },
]
export const initialNotes: Note[] = [
  { id: 'NOTE-1', personId: 'P-14001', author: 'مریم رضایی', role: 'assistant', title: 'کارشناس پرونده', text: 'مدارک هویتی بررسی شد؛ در انتظار تکمیل اطلاعات بیمه‌ای.', createdAt: '۱۴ شهریور ۱۴۰۵ · ۱۰:۱۵' },
  { id: 'NOTE-2', personId: 'P-14001', author: 'احمد محمدی', role: 'admin', title: 'مدیر سیستم', text: 'ممنون. بعد از تکمیل اطلاعات دوباره به من اطلاع بدهید.', createdAt: '۱۴ شهریور ۱۴۰۵ · ۱۱:۰۲' },
]
export const rolePermissions: Record<Role, Permission[]> = {
  admin: ['view_persons', 'create_person', 'edit_person', 'change_status', 'view_activities', 'manage_users', 'view_reports', 'delete_person'],
  assistant: ['view_persons', 'create_person', 'edit_person'],
  reviewer: ['view_persons', 'change_status', 'view_activities'],
}
export const permissionLabels: Record<Permission, string> = { view_persons: 'مشاهده افراد', create_person: 'ایجاد فرد', edit_person: 'ویرایش اطلاعات فرد', change_status: 'تغییر وضعیت', view_activities: 'مشاهده فعالیت‌ها', manage_users: 'مدیریت کاربران', view_reports: 'مشاهده گزارش‌ها', delete_person: 'حذف پرونده' }
export const defaultRoles: RoleDef[] = [
  { id: 'admin', title: 'مدیر سیستم', permissions: [...rolePermissions.admin], builtin: true },
  { id: 'assistant', title: 'کارشناس پرونده', permissions: [...rolePermissions.assistant], builtin: true },
  { id: 'reviewer', title: 'کارشناس مرکز', permissions: [...rolePermissions.reviewer], builtin: true },
]
export const userByRole: Record<Role, { name: string; title: string }> = { admin: { name: 'احمد محمدی', title: 'مدیر سیستم' }, assistant: { name: 'مریم رضایی', title: 'کارشناس پرونده' }, reviewer: { name: 'محمد رضایی', title: 'کارشناس مرکز' } }
export const allPermissions = Object.keys(permissionLabels) as Permission[]
export const defaultSettings: AppSettings = { appName: 'سامانه مدیریت پرونده ناب', twoFactor: true, auditLog: true, autoLogout: false, autoLogoutMins: 30, font: 'vazir' }
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

export const applySavedFont = () => {
  const { font } = { ...defaultSettings, ...load('nab:settings', defaultSettings) }
  document.documentElement.style.setProperty('--font-main', fontStacks[font] ?? fontStacks.vazir)
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
    password: typeof u.password === 'string' && u.password ? u.password : '',
    active: typeof u.active === 'boolean' ? u.active : true,
    permissions: Array.isArray(u.permissions) ? (u.permissions as Permission[]) : [...(rolePermissions[role] ?? [])],
  }
}

export const validNationalId = (value: string) => { if (!/^\d{10}$/.test(value) || /^(\d)\1{9}$/.test(value)) return false; const sum = value.slice(0, 9).split('').reduce((n, d, i) => n + Number(d) * (10 - i), 0) % 11; const check = Number(value[9]); return check === (sum < 2 ? sum : 11 - sum) }
export const activityMonth = (a: Activity) => {
  if (a.ts) { const j = jalaliParts(new Date(a.ts)); return { y: j.y, m: j.m } }
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
export const computeBottlenecks = (acts: Activity[]): { status: Status; label: string; count: number }[] => {
  const byPerson = new Map<string, Activity[]>()
  for (const a of acts) if (a.ts && a.newStatus) { const arr = byPerson.get(a.personId) ?? []; arr.push(a); byPerson.set(a.personId, arr) }
  const acc = new Map<string, { sum: number; count: number }>()
  for (const arr of byPerson.values()) {
    arr.sort((x, y) => (x.ts ?? 0) - (y.ts ?? 0))
    for (let i = 0; i < arr.length - 1; i++) {
      const cur = arr[i], next = arr[i + 1]
      if (!cur.newStatus) continue
      const e = acc.get(cur.newStatus) ?? { sum: 0, count: 0 }
      e.sum += (next.ts ?? 0) - (cur.ts ?? 0)
      e.count += 1
      acc.set(cur.newStatus, e)
    }
  }
  return workflow.map(s => {
    const e = acc.get(s)
    if (!e || !e.count) return { status: s, label: '—', count: 0 }
    const days = e.sum / e.count / 86400000
    const label = days >= 1 ? `${Math.round(days).toLocaleString('fa-IR')} روز` : `${Math.max(1, Math.round(days * 24)).toLocaleString('fa-IR')} ساعت`
    return { status: s, label, count: e.count }
  })
}
export const rangeDefs: [string, number, string][] = [['day', 1, 'امروز'], ['week', 7, '۷ روز گذشته'], ['month', 30, '۳۰ روز گذشته'], ['season', 90, '۹۰ روز گذشته']]
export const validBirthDate = (value: string) => { const v = normalizeDigits(value.trim()); return /^(13|14)\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/.test(v) && v <= jalaliToday() }
export const downloadCsv = (filename: string, headers: string[], rows: (string | number | null)[][]) => {
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}
export const imageToDataUrl = (file: File, max = 160): Promise<string> => new Promise((resolve, reject) => {
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
    URL.revokeObjectURL(url)
    resolve(canvas.toDataURL('image/jpeg', 0.85))
  }
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad-image')) }
  img.src = url
})

export const timelineTone = (a: Activity) => a.action === 'رد پرونده' || a.newStatus === 'رد شده' ? 'red' : a.action.startsWith('ایجاد') || a.newStatus === 'تأیید شده' ? 'green' : a.action.includes('یادداشت') ? 'purple' : a.action.includes('ویرایش') ? 'amber' : 'blue'
