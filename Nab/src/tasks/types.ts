export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskType = 'personal' | 'organizational'

export interface TaskLog {
  id: string
  action: string
  createdAt: string
  createdBy: string
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface WorkTask {
  id: string
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  startDate: string
  dueDate: string
  category: string
  tags: string[]
  note: string
  createdBy: string
  createdByName: string
  createdAt: string
  ts: number
  completedAt?: string
  timeSpentMinutes?: number
  subtasks?: Subtask[]
  history: TaskLog[]
}

export interface TaskFields {
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  startDate: string
  dueDate: string
  category: string
  tags: string[]
  note: string
  timeSpentMinutes?: number
  subtasks?: Subtask[]
}

export interface UserLite {
  username: string
  name: string
}

export type QuickFilter = 'all' | 'today' | 'in_progress' | 'completed' | 'overdue' | 'high'

export interface TaskFilterState {
  q: string
  status: string
  priority: string
  category: string
  sort: string
  view: 'list' | 'kanban' | 'gantt'
}

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: 'جدید',
  in_progress: 'در حال انجام',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده',
}

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
  critical: 'بحرانی',
}

export const taskTypeLabels: Record<TaskType, string> = {
  personal: 'شخصی',
  organizational: 'سازمانی',
}

export const taskPriorityTones: Record<TaskPriority, string> = {
  low: 'slate',
  medium: 'blue',
  high: 'amber',
  critical: 'red',
}

export const taskStatusOrder: TaskStatus[] = ['todo', 'in_progress', 'completed', 'cancelled']
export const taskPriorityOrder: TaskPriority[] = ['low', 'medium', 'high', 'critical']
export const priorityRank: Record<TaskPriority, number> = { critical: 3, high: 2, medium: 1, low: 0 }

export const taskStatusFilterOptions: [string, string][] = [
  ['all', 'همه وضعیت‌ها'],
  ['todo', 'جدید'],
  ['in_progress', 'در حال انجام'],
  ['completed', 'تکمیل‌شده'],
  ['cancelled', 'لغوشده'],
  ['overdue', 'عقب‌افتاده'],
]

export const taskPriorityFilterOptions: [string, string][] = [
  ['all', 'همه اولویت‌ها'],
  ['low', 'کم'],
  ['medium', 'متوسط'],
  ['high', 'زیاد'],
  ['critical', 'بحرانی'],
]

export const taskSortOptions: [string, string][] = [
  ['newest', 'جدیدترین'],
  ['oldest', 'قدیمی‌ترین'],
  ['dueAsc', 'نزدیک‌ترین موعد'],
  ['dueDesc', 'دورترین موعد'],
  ['priority', 'بالاترین اولویت'],
]
