import type { User } from './types'

const API_BASE = '/api.php'
let csrfToken = ''

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface AppBootstrap {
  user: User
  users: User[]
  csrf: string
  state: Record<string, unknown[]>
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
    response = await fetch(`${API_BASE}?action=${encodeURIComponent(action)}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers,
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    })
  } catch {
    throw new ApiError('اتصال به API هاست برقرار نشد. تنظیم PHP/MySQL و HTTPS را بررسی کنید.')
  }

  let payload: { success?: boolean; error?: string; data?: T; csrf?: string; needs_setup?: boolean }
  try {
    payload = await response.json()
  } catch {
    throw new ApiError('پاسخ API معتبر نیست؛ مسیر /api.php باید توسط PHP اجرا شود.', response.status)
  }
  if (!response.ok || payload.success !== true) {
    if (response.status === 401 && signalUnauthorized && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nab:auth-expired'))
    }
    throw new ApiError(payload.error || 'درخواست به سرور ناموفق بود.', response.status)
  }
  const nestedCsrf = typeof payload.data === 'object' && payload.data !== null && 'csrf' in payload.data
    ? (payload.data as { csrf?: unknown }).csrf
    : undefined
  if (typeof payload.csrf === 'string') csrfToken = payload.csrf
  else if (typeof nestedCsrf === 'string') csrfToken = nestedCsrf
  if (payload.data !== undefined) return payload.data as T
  return payload as T
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
}

export function syncSave(key: string, value: unknown[]): Promise<void> {
  return request<void>('state_save', 'POST', { key, value })
}

export function importLegacyState(state: Record<string, unknown[]>): Promise<void> {
  return request<void>('legacy_import', 'POST', { state })
}

export function importLegacyTasks(tasks: unknown[]): Promise<void> {
  return request<void>('legacy_tasks_import', 'POST', { tasks })
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

export function syncTasks(tasks: unknown[]): Promise<void> {
  return request<void>('tasks_save', 'POST', { tasks })
}
