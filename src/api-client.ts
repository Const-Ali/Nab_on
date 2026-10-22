import type { Activity, AppNotification, Audit, PeopleImportRow, Person, ServerPersonExportRow, User } from './types'
import type { WorkflowConfig } from './workflow'

const API_BASE = '/api.php'
let csrfToken = ''
let stateVersions: Record<string, string> = {}
const stateWriteQueues = new Map<string, Promise<void>>()

export class ApiError extends Error {
  status: number
  code: string
  constructor(message: string, status = 0, code = '') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export interface AppBootstrap {
  user: User
  users: User[]
  user_count?: number
  csrf: string
  state: Record<string, unknown[]>
  state_versions: Record<string, string>
}

async function request<T>(
  action: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>,
  signalUnauthorized = true,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json'
    if (csrfToken && !['login', 'setup'].includes(action)) headers['X-CSRF-Token'] = csrfToken
  }
  let response: Response
  try {
    const url = action.startsWith(`${API_BASE}?`) ? action : `${API_BASE}?action=${encodeURIComponent(action)}`
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers,
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    })
  } catch {
    throw new ApiError('اتصال به API هاست برقرار نشد. تنظیم PHP/MySQL و HTTPS را بررسی کنید.')
  }

  let payload: { success?: boolean; error?: string; code?: string; data?: T; csrf?: string; needs_setup?: boolean }
  try {
    payload = await response.json()
  } catch {
    throw new ApiError('پاسخ API معتبر نیست؛ مسیر /api.php باید توسط PHP اجرا شود.', response.status)
  }
  if (!response.ok || payload.success !== true) {
    if (response.status === 401 && signalUnauthorized && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nab:auth-expired'))
    }
    throw new ApiError(payload.error || 'درخواست به سرور ناموفق بود.', response.status, payload.code ?? '')
  }
  const nestedCsrf = typeof payload.data === 'object' && payload.data !== null && 'csrf' in payload.data
    ? (payload.data as { csrf?: unknown }).csrf
    : undefined
  const nestedVersions = typeof payload.data === 'object' && payload.data !== null && 'state_versions' in payload.data
    ? (payload.data as { state_versions?: unknown }).state_versions
    : undefined
  if (typeof payload.csrf === 'string') csrfToken = payload.csrf
  else if (typeof nestedCsrf === 'string') csrfToken = nestedCsrf
  if (nestedVersions && typeof nestedVersions === 'object' && !Array.isArray(nestedVersions)) {
    stateVersions = Object.fromEntries(
      Object.entries(nestedVersions).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    )
  }
  if (payload.data !== undefined) return payload.data as T
  return payload as T
}

function queueStateWrite(key: string, action: string, body: Record<string, unknown>): Promise<void> {
  const previous = stateWriteQueues.get(key) ?? Promise.resolve()
  const current = previous.catch(() => undefined).then(async () => {
    const expectedVersion = stateVersions[key]
    if (!expectedVersion) {
      throw new ApiError('نسخهٔ همگام‌سازی در دسترس نیست؛ صفحه را تازه‌سازی و دوباره وارد شوید.', 428, 'missing_state_version')
    }
    const result = await request<{ version: string }>(action, 'POST', { ...body, expected_version: expectedVersion })
    if (!result || typeof result.version !== 'string' || !/^[a-f0-9]{64}$/.test(result.version)) {
      throw new ApiError('پاسخ نسخهٔ ذخیره‌سازی معتبر نیست؛ صفحه را تازه‌سازی کنید.')
    }
    stateVersions[key] = result.version
  })
  stateWriteQueues.set(key, current)
  void current.finally(() => {
    if (stateWriteQueues.get(key) === current) stateWriteQueues.delete(key)
  }).catch(() => undefined)
  return current
}

export async function getSetupStatus(): Promise<boolean> {
  const result = await request<{ success: boolean; needs_setup: boolean }>('status', 'GET', undefined, false)
  return Boolean((result as { needs_setup?: boolean }).needs_setup)
}

export function bootstrap(): Promise<AppBootstrap> {
  return request<AppBootstrap>('bootstrap', 'GET')
}

export function login(username: string, password: string, remember: boolean): Promise<AppBootstrap> {
  return request<AppBootstrap>('login', 'POST', { username, password, remember }, false)
}

export function setupAdmin(input: { setup_key: string; username: string; name: string; password: string }): Promise<AppBootstrap> {
  return request<AppBootstrap>('setup', 'POST', input, false)
}

export async function logout(): Promise<void> {
  await request<{ success: boolean }>('logout', 'POST')
  csrfToken = ''
  stateVersions = {}
}

export function syncSave(key: string, value: unknown[]): Promise<void> {
  return queueStateWrite(key, 'state_save', { key, value })
}

export function fetchNotifications(): Promise<{ items: AppNotification[] }> {
  return request<{ items: AppNotification[] }>('notifications_get')
}

export function markNotificationsRead(username: string, ids: string[], all = false): Promise<{ items: AppNotification[] }> {
  const key = `nab:notifications:${username}`
  const expectedVersion = stateVersions[key]
  if (!expectedVersion) throw new ApiError('نسخهٔ اعلان‌ها در دسترس نیست؛ صفحه را تازه‌سازی کنید.', 428, 'missing_notification_version')
  return request<{ items: AppNotification[] }>('notifications_read', 'POST', { ids, all, expected_version: expectedVersion })
}

export interface ServerPeopleExport {
  people: ServerPersonExportRow[]
}

export function fetchServerPeopleForExport(): Promise<ServerPeopleExport> {
  return request<ServerPeopleExport>('people_export_get')
}

export interface PeopleImportSnapshot {
  nationalIds: string[]
  activeUsernames: string[]
  count: number
  canAssign: boolean
}

export function fetchPeopleImportSnapshot(): Promise<PeopleImportSnapshot> {
  return request<PeopleImportSnapshot>('people_import_snapshot')
}

export interface PeopleImportResult {
  people: Person[]
  audit: Audit[]
  activities?: Activity[]
  importedCount: number
}

export function importPeople(rows: PeopleImportRow[]): Promise<PeopleImportResult> {
  const expectedVersion = stateVersions['nab:people']
  if (!expectedVersion) throw new ApiError('نسخهٔ پرونده‌ها در دسترس نیست؛ صفحه را تازه‌سازی کنید.', 428, 'missing_people_version')
  return request<PeopleImportResult>('people_import', 'POST', { rows, expected_version: expectedVersion })
}

export function saveWorkflow(config: WorkflowConfig, expectedVersion: string): Promise<{ version: string }> {
  return request<{ version: string }>('workflow_save', 'POST', { workflow: config, expected_version: expectedVersion })
}

export function importLegacyState(state: Record<string, unknown[]>): Promise<void> {
  return request<void>('legacy_import', 'POST', { state })
}

export function importLegacyTasks(tasks: unknown[]): Promise<void> {
  return request<void>('legacy_tasks_import', 'POST', { tasks })
}

export interface SafetyBackupResult {
  safety_backup_id: string
  message: string
}

async function binaryRequest(action: string, init: RequestInit): Promise<{ blob: Blob; filename: string }> {
  let response: Response
  try {
    const url = action.startsWith(`${API_BASE}?`) ? action : `${API_BASE}?action=${encodeURIComponent(action)}`
    response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...init,
    })
  } catch {
    throw new ApiError('اتصال به API هاست برقرار نشد.')
  }
  if (!response.ok) {
    let payload: { error?: string; code?: string } = {}
    try { payload = await response.json() as typeof payload } catch { /* Non-JSON error from PHP/proxy. */ }
    if (response.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nab:auth-expired'))
    throw new ApiError(payload.error || 'درخواست بکاپ ناموفق بود.', response.status, payload.code ?? '')
  }
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? 'nab-backup.nabbak'
  return { blob, filename }
}

export async function downloadFullBackup(currentPassword: string, backupPassword: string): Promise<void> {
  const headers: Record<string, string> = { Accept: 'application/octet-stream', 'Content-Type': 'application/json' }
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  const { blob, filename } = await binaryRequest('backup_export', {
    method: 'POST', headers,
    body: JSON.stringify({ current_password: currentPassword, backup_password: backupPassword }),
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function restoreFullBackup(file: File, currentPassword: string, archivePassword: string, safetyPassword: string, confirmation: string): Promise<SafetyBackupResult> {
  const form = new FormData()
  form.append('backup_file', file)
  form.append('current_password', currentPassword)
  form.append('archive_password', archivePassword)
  form.append('safety_password', safetyPassword)
  form.append('confirmation', confirmation)
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  let response: Response
  try {
    response = await fetch(`${API_BASE}?action=backup_restore`, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers, body: form })
  } catch {
    throw new ApiError('بارگذاری بکاپ روی هاست ناموفق بود؛ اتصال و محدودیت فایل PHP را بررسی کنید.')
  }
  let payload: { success?: boolean; error?: string; code?: string; data?: SafetyBackupResult }
  try { payload = await response.json() as typeof payload } catch { throw new ApiError('پاسخ API معتبر نیست؛ محدودیت post_max_size یا upload_max_filesize هاست را بررسی کنید.', response.status) }
  if (!response.ok || payload.success !== true || !payload.data) {
    if (response.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nab:auth-expired'))
    throw new ApiError(payload.error || 'بازیابی بکاپ ناموفق بود.', response.status, payload.code ?? '')
  }
  return payload.data
}

export async function downloadSafetyBackup(id: string): Promise<void> {
  const safeId = id.trim()
  if (!/^[a-f0-9]{64}$/.test(safeId)) throw new ApiError('شناسهٔ بکاپ ایمنی معتبر نیست.')
  const { blob, filename } = await binaryRequest(`${API_BASE}?action=backup_safety_download&id=${encodeURIComponent(safeId)}`, { method: 'GET' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function purgeServerData(currentPassword: string, safetyPassword: string, confirmation: string): Promise<SafetyBackupResult> {
  return request<SafetyBackupResult>('server_purge', 'POST', {
    current_password: currentPassword,
    safety_password: safetyPassword,
    confirmation,
  })
}

export function saveUser(input: Record<string, unknown>): Promise<User> {
  return request<User>('user_create', 'POST', input)
}

export function updateUser(input: Record<string, unknown>): Promise<User> {
  return request<User>('user_update', 'POST', input)
}

export async function deleteUser(username: string): Promise<void> {
  await request<void>('user_delete', 'POST', { username })
}

export function updateProfile(input: Record<string, unknown>): Promise<User> {
  return request<User>('profile_update', 'POST', input)
}

export function fetchTasks(): Promise<unknown[]> {
  return request<unknown[]>('tasks_get', 'GET')
}

export function syncTasks(tasks: unknown[], username: string): Promise<void> {
  return queueStateWrite(`nab:tasks:${username}`, 'tasks_save', { tasks })
}
