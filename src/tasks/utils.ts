import { jalaliJdn, jalaliParts, load, normalizeText } from '../shared'
import { priorityRank } from './types'
import type { TaskStatus, TaskPriority, TaskType, WorkTask } from './types'

export const todayJdn = () => {
  const j = jalaliParts(new Date())
  return jalaliJdn(j.y, j.m, j.d)
}

export const dateJdn = (latin: string): number | null => {
  const m = latin.match(/^(\d{3,4})\/(\d{1,2})\/(\d{1,2})$/)
  return m ? jalaliJdn(Number(m[1]), Number(m[2]), Number(m[3])) : null
}

export const validJalaliDate = (value: string) => /^1[34]\d{2}\/(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])$/.test(value)

const isDone = (t: WorkTask) => t.status === 'completed' || t.status === 'cancelled'

export const isOverdue = (t: WorkTask): boolean => {
  if (!t.dueDate || isDone(t)) return false
  const d = dateJdn(t.dueDate)
  return d !== null && d < todayJdn()
}

export const overdueDays = (t: WorkTask): number => {
  const d = dateJdn(t.dueDate)
  return d === null ? 0 : Math.max(0, todayJdn() - d)
}

export const isDueToday = (t: WorkTask): boolean => {
  const d = dateJdn(t.dueDate)
  return d !== null && d === todayJdn() && !isDone(t)
}

export const isHighPriority = (t: WorkTask): boolean =>
  (t.priority === 'high' || t.priority === 'critical') && !isDone(t)

export const matchesQuery = (t: WorkTask, q: string): boolean =>
  normalizeText(`${t.title} ${t.description} ${t.category} ${t.tags.join(' ')}`).includes(normalizeText(q))

export const sortTasks = (list: WorkTask[], mode: string): WorkTask[] => {
  const arr = [...list]
  const due = (t: WorkTask) => dateJdn(t.dueDate) ?? Number.MAX_SAFE_INTEGER
  switch (mode) {
    case 'oldest': return arr.sort((a, b) => a.ts - b.ts)
    case 'dueAsc': return arr.sort((a, b) => due(a) - due(b))
    case 'dueDesc': return arr.sort((a, b) => due(b) - due(a))
    case 'priority': return arr.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || b.ts - a.ts)
    default: return arr.sort((a, b) => b.ts - a.ts)
  }
}

const statuses: TaskStatus[] = ['todo', 'in_progress', 'completed', 'cancelled']
const priorities: TaskPriority[] = ['low', 'medium', 'high', 'critical']
const types: TaskType[] = ['personal', 'organizational']

export const normalizeTask = (raw: unknown, index: number): WorkTask => {
  const t = (typeof raw === 'object' && raw ? raw : {}) as Partial<WorkTask>
  return {
    id: typeof t.id === 'string' ? t.id : `TASK-legacy-${index}`,
    title: typeof t.title === 'string' && t.title ? t.title : 'بدون عنوان',
    description: typeof t.description === 'string' ? t.description : '',
    type: types.includes(t.type as TaskType) ? (t.type as TaskType) : 'personal',
    status: statuses.includes(t.status as TaskStatus) ? (t.status as TaskStatus) : 'todo',
    priority: priorities.includes(t.priority as TaskPriority) ? (t.priority as TaskPriority) : 'medium',
    startDate: typeof t.startDate === 'string' ? t.startDate : '',
    dueDate: typeof t.dueDate === 'string' ? t.dueDate : '',
    category: typeof t.category === 'string' ? t.category : '',
    tags: Array.isArray(t.tags) ? t.tags.filter((x): x is string => typeof x === 'string') : [],
    note: typeof t.note === 'string' ? t.note : '',
    createdBy: typeof t.createdBy === 'string' ? t.createdBy : '',
    createdByName: typeof t.createdByName === 'string' ? t.createdByName : '',
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : '',
    ts: typeof t.ts === 'number' ? t.ts : 0,
    completedAt: typeof t.completedAt === 'string' ? t.completedAt : undefined,
    history: Array.isArray(t.history) ? t.history : [],
  }
}

export interface TaskSummary {
  total: number
  active: number
  today: number
  overdue: number
  doneToday: number
  totalToday: number
}

export const taskStoreSummary = (username: string): TaskSummary => {
  const tasks = load<unknown[]>(`nab:tasks:${username}`, []).map(normalizeTask)
  const dueToday = tasks.filter(t => dateJdn(t.dueDate) === todayJdn())
  const completedToday = tasks.filter(t => dateJdn(t.dueDate) === todayJdn() && t.status === 'completed')
  return {
    total: tasks.length,
    active: tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length,
    today: dueToday.filter(t => t.status !== 'completed').length,
    overdue: tasks.filter(isOverdue).length,
    doneToday: completedToday.length,
    totalToday: dueToday.length + completedToday.length,
  }
}
