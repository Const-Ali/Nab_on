import { Button } from '../components/common/Button'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { nowStamp, nowTs, playChime, uid } from '../shared'
import { Heading } from '../shared-ui'
import WorkDashboard from './components/WorkDashboard'
import TaskFilters from './components/TaskFilters'
import TaskList from './components/TaskList'
import TaskKanban from './components/TaskKanban'
import TaskGantt from './components/TaskGantt'
import TaskForm from './components/TaskForm'
import TaskDetails from './components/TaskDetails'
import { PomodoroTimer } from '../components/common/PomodoroTimer'
import { taskPriorityLabels, taskStatusLabels } from './types'
import type {
  QuickFilter,
  TaskFields,
  TaskFilterState,
  TaskStatus,
  TaskType,
  UserLite,
  WorkTask,
} from './types'
import {
  isDueToday,
  isHighPriority,
  isOverdue,
  matchesQuery,
  sortTasks,
} from './utils'
import './tasks.css'
import { cn, panelBox } from '../components/ui'

function encryptDraft(json: string, key: string): string {
  try {
    let out = ''
    for (let i = 0; i < json.length; i++) out += String.fromCharCode(json.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    return btoa(unescape(encodeURIComponent(out)))
  } catch { return '' }
}

function decryptDraft(payload: string, key: string): string | null {
  try {
    const decoded = decodeURIComponent(escape(atob(payload)))
    let out = ''
    for (let i = 0; i < decoded.length; i++) out += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    return out
  } catch { return null }
}

interface Props {
  users: UserLite[]
  sessionUsername: string
  sessionName: string
  initialTasks: WorkTask[]
  canCreate: boolean
  canEdit: boolean
  canChangeStatus: boolean
  canDelete: boolean
  onTasksChange: (tasks: WorkTask[]) => void | WorkTask[] | Promise<void | WorkTask[]>
}

const defaultFilters: TaskFilterState = {
  q: '',
  status: 'all',
  priority: 'all',
  category: 'all',
  sort: 'newest',
  view: 'list',
}

export default function WorkManagementPage({ users, sessionUsername, sessionName, initialTasks, canCreate, canEdit, canChangeStatus, canDelete, onTasksChange }: Props) {
  const [tasks, setTasks] = useState<WorkTask[]>(initialTasks)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const lastSavedRef = useRef<string>(JSON.stringify(initialTasks))
  const initialSyncDoneRef = useRef(false)

  const draftKey = `nab:tasks:draft:${sessionUsername}`

  // Restore pending draft after a failed save that would otherwise be lost on refresh (encrypted with username as key)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const decrypted = decryptDraft(raw, sessionUsername || 'nab-default-key')
      if (!decrypted) return
      const parsed = JSON.parse(decrypted) as WorkTask[]
      if (!Array.isArray(parsed) || !parsed.length) return
      const draftJson = JSON.stringify(parsed)
      const initialJson = JSON.stringify(initialTasks)
      if (draftJson !== initialJson) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTasks(parsed)
        setSaveError('تغییرات ذخیره‌نشدهٔ قبلی بازیابی شد. برای ذخیره روی هاست، «تلاش مجدد» را بزنید.')
      }
    } catch {
      // ignore corrupt draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUsername])

  // Keep lastSavedRef in sync if initialTasks changes due to server refresh (e.g., after successful retry)
  useEffect(() => {
    const initialJson = JSON.stringify(initialTasks)
    if (!initialSyncDoneRef.current) {
      lastSavedRef.current = initialJson
      initialSyncDoneRef.current = true
      return
    }
    // If server provided a newer snapshot that matches our current tasks, update ref
    const currentJson = JSON.stringify(tasks)
    if (initialJson === currentJson) {
      lastSavedRef.current = initialJson
    } else if (currentJson === lastSavedRef.current) {
      // Our local tasks are still at last saved point, adopt server's version (authoritative timestamps)
      lastSavedRef.current = initialJson
    }
  }, [initialTasks, tasks])

  // Persisted save with retry + localStorage draft
  useEffect(() => {
    const submitted = tasks
    const submittedJson = JSON.stringify(submitted)
    if (submittedJson === lastSavedRef.current) return

    // Guard against absurd payloads (>5MB JSON) that would fill nab_state
    if (submittedJson.length > 5 * 1024 * 1024) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaveError('حجم کارها بیش از حد مجاز است (۵ مگابایت). لطفاً کارهای قدیمی یا یادداشت‌های طولانی را پاک کنید.')
      return
    }
    let active = true
    setIsSaving(true)
    setSaveError('')

    try {
      const enc = encryptDraft(submittedJson, sessionUsername || 'nab-default-key')
      if (enc) localStorage.setItem(draftKey, enc)
    } catch {
      // storage quota or private mode — ignore
    }

    void (async () => {
      try {
        const saved = await onTasksChange(submitted)
        if (!active) return
        setIsSaving(false)
        setSaveError('')
        try { localStorage.removeItem(draftKey) } catch {
      // ignore
    }
        if (Array.isArray(saved)) {
          const savedJson = JSON.stringify(saved)
          lastSavedRef.current = savedJson
          setTasks(current => {
            if (JSON.stringify(current) !== submittedJson) return current
            return savedJson === submittedJson ? current : (saved as WorkTask[])
          })
        } else {
          lastSavedRef.current = submittedJson
        }
      } catch (err) {
        if (!active) return
        setIsSaving(false)
        const msg = err instanceof Error ? err.message : 'ذخیرهٔ کارها روی هاست ناموفق بود.'
        setSaveError(msg)
      }
    })()

    return () => { active = false }
  }, [tasks, onTasksChange, draftKey, sessionUsername])

  const retrySave = useCallback(() => {
    const submitted = tasks
    const submittedJson = JSON.stringify(submitted)
    setIsSaving(true)
    setSaveError('')
    void (async () => {
      try {
        const saved = await onTasksChange(submitted)
        setIsSaving(false)
        setSaveError('')
        try { localStorage.removeItem(draftKey) } catch {
      // ignore
    }
        if (Array.isArray(saved)) {
          const savedJson = JSON.stringify(saved)
          lastSavedRef.current = savedJson
          setTasks(current => {
            if (JSON.stringify(current) !== submittedJson) return current
            return savedJson === submittedJson ? current : (saved as WorkTask[])
          })
        } else {
          lastSavedRef.current = submittedJson
        }
      } catch (err) {
        setIsSaving(false)
        const msg = err instanceof Error ? err.message : 'ذخیرهٔ کارها روی هاست ناموفق بود.'
        setSaveError(msg)
      }
    })()
  }, [tasks, onTasksChange, draftKey])

  // Warn before unload if there are unsaved changes
  useEffect(() => {
    if (!saveError) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'تغییرات ذخیره‌نشده دارید. آیا مطمئنید می‌خواهید خارج شوید؟'
      return e.returnValue
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [saveError])

  const [tab, setTab] = useState<TaskType>('personal')
  const [quick, setQuick] = useState<QuickFilter>('all')
  const [filters, setFilters] = useState<TaskFilterState>(defaultFilters)
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 20
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WorkTask | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [activePomoTask, setActivePomoTask] = useState<WorkTask | null>(null)
  const [showPomo, setShowPomo] = useState(false)

  const mine = tasks
  const typed = useMemo(() => mine.filter(t => t.type === tab), [mine, tab])
  const categories = useMemo(
    () => Array.from(new Set(mine.map(t => t.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fa')),
    [mine],
  )

  const filtered = useMemo(() => {
    const quickOk = (t: WorkTask) =>
      quick === 'all'
        ? true
        : quick === 'today'
          ? isDueToday(t)
          : quick === 'in_progress'
            ? t.status === 'in_progress'
            : quick === 'completed'
              ? t.status === 'completed'
              : quick === 'overdue'
                ? isOverdue(t)
                : isHighPriority(t)
    const filterOk = (t: WorkTask) =>
      (filters.status === 'all' ? true : filters.status === 'overdue' ? isOverdue(t) : t.status === filters.status) &&
      (filters.priority === 'all' || t.priority === filters.priority) &&
      (filters.category === 'all' || t.category === filters.category) &&
      (!filters.q || matchesQuery(t, filters.q))
    return sortTasks(typed.filter(t => quickOk(t) && filterOk(t)), filters.sort)
  }, [typed, quick, filters])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPageIndex(0) }, [filtered.length, tab, quick, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize), [filtered, pageIndex, pageSize])
  const detailTask = detailId ? (mine.find(t => t.id === detailId) ?? null) : null
  const isFiltering =
    quick !== 'all' ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.category !== 'all' ||
    Boolean(filters.q)

  const log = (action: string) => ({ id: uid('TL'), action, createdAt: nowStamp(), createdBy: sessionName })

  const saveTask = (fields: TaskFields) => {
    if ((editing && !canEdit) || (!editing && !canCreate)) return
    if (editing) {
      const logs: string[] = []
      if (fields.status !== editing.status) logs.push(`وضعیت به «${taskStatusLabels[fields.status]}» تغییر کرد`)
      if (fields.priority !== editing.priority)
        logs.push(`اولویت از «${taskPriorityLabels[editing.priority]}» به «${taskPriorityLabels[fields.priority]}» تغییر کرد`)
      if (fields.dueDate !== editing.dueDate) logs.push(`مهلت انجام به «${fields.dueDate || '—'}» تغییر کرد`)
      if (fields.title !== editing.title) logs.push('عنوان ویرایش شد')
      if (!logs.length) logs.push('جزئیات کار ویرایش شد')
      const completedAt =
        fields.status === 'completed' && editing.status !== 'completed'
          ? nowStamp()
          : fields.status !== 'completed'
            ? undefined
            : editing.completedAt
      setTasks(cur =>
        cur.map(t =>
          t.id === editing.id
            ? { ...t, ...fields, completedAt, history: [...t.history, ...logs.map(log)] }
            : t,
        ),
      )
      if (fields.status === 'completed' && editing.status !== 'completed') {
        playChime('complete')
      } else {
        playChime('success')
      }
    } else {
      const task: WorkTask = {
        id: uid('TASK'),
        ...fields,
        createdBy: sessionUsername,
        createdByName: sessionName,
        createdAt: nowStamp(),
        ts: nowTs(),
        completedAt: fields.status === 'completed' ? nowStamp() : undefined,
        history: [log('کار ایجاد شد')],
      }
      setTasks(cur => [task, ...cur])
      setTab(fields.type)
      playChime('success')
    }
    setFormOpen(false)
    setEditing(null)
  }

  const toggleDone = (t: WorkTask) => {
    if (!canChangeStatus) return
    const done = t.status === 'completed'
    if (!done) {
      playChime('complete')
    } else {
      playChime('click')
    }
    setTasks(cur =>
      cur.map(x =>
        x.id === t.id
          ? {
              ...x,
              status: done ? 'todo' : 'completed',
              completedAt: done ? undefined : nowStamp(),
              history: [...x.history, log(done ? 'کار بازگشایی شد' : 'کار تکمیل شد')],
            }
          : x,
      ),
    )
  }

  const moveTask = (id: string, status: TaskStatus) => {
    if (!canChangeStatus) return
    if (status === 'completed') {
      playChime('complete')
    } else {
      playChime('click')
    }
    setTasks(cur =>
      cur.map(x => {
        if (x.id !== id || x.status === status) return x
        return {
          ...x,
          status,
          completedAt: status === 'completed' ? nowStamp() : undefined,
          history: [...x.history, log(`وضعیت به «${taskStatusLabels[status]}» تغییر کرد`)],
        }
      }),
    )
  }

  const deleteTask = (t: WorkTask) => {
    if (!canDelete) return
    if (!window.confirm(`کار «${t.title}» حذف شود؟ این عمل قابل بازگشت نیست.`)) return
    setTasks(cur => cur.filter(x => x.id !== t.id))
    setDetailId(null)
  }

  const logTimeForTask = useCallback((minutes: number, taskId?: string) => {
    const targetId = taskId ?? activePomoTask?.id
    if (!targetId) return
    if (!canEdit) return
    setTasks(cur =>
      cur.map(t =>
        t.id === targetId
          ? {
              ...t,
              timeSpentMinutes: (t.timeSpentMinutes ?? 0) + minutes,
              history: [...t.history, log(`${minutes} دقیقه تمرکز با پومودورو ثبت شد`)],
            }
          : t,
      ),
    )
  }, [activePomoTask?.id, canEdit, sessionName]) // eslint-disable-line react-hooks/exhaustive-deps

  const personalCount = mine.filter(t => t.type === 'personal').length
  const orgCount = mine.filter(t => t.type === 'organizational').length

  return (
    <>
      <Heading
        title="مدیریت کارهای من"
        subtitle="کارهای شخصی و سازمانی شما — همراه با تایم‌لاین، ماتریس اولویت و تایمر تمرکز پومودورو."
        action={canCreate || canEdit ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {canEdit && <Button
              type="button"
              variant="outline"
              size="sm"
              active={showPomo}
              onClick={() => {
                setShowPomo(p => !p)
                if (!showPomo && !activePomoTask && filtered.length > 0) {
                  setActivePomoTask(filtered[0])
                }
              }}
              title="تایمر تمرکز پومودورو"
              className="whitespace-nowrap"
            >
               تایمر پومودورو
            </Button>}
            {canCreate && <Button
              type="button"
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="whitespace-nowrap"
            >
               ایجاد کار جدید
            </Button>}
          </div>
        ) : undefined}
      />

      {(saveError || isSaving) && (
        <div className={cn('mx-auto mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm', saveError ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300')}>
          <span>{isSaving ? 'در حال ذخیرهٔ کارها روی هاست…' : `ذخیره ناموفق: ${saveError}`}</span>
          {saveError && (
            <Button type="button" variant="primary" size="xs" onClick={retrySave}>
              تلاش مجدد
            </Button>
          )}
        </div>
      )}

      <WorkDashboard tasks={typed} quick={quick} onQuick={setQuick} />

      <div className="my-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900" role="group" aria-label="نوع کار">
        <Button type="button" variant="tab" size="sm" active={tab === 'personal'} className={tab === 'personal' ? 'on' : ''} onClick={() => setTab('personal')}>
          کارهای شخصی <em>{personalCount.toLocaleString('fa-IR')}</em>
        </Button>
        <Button type="button" variant="tab" size="sm" active={tab === 'organizational'} className={tab === 'organizational' ? 'on' : ''} onClick={() => setTab('organizational')}>
          کارهای سازمانی <em>{orgCount.toLocaleString('fa-IR')}</em>
        </Button>
      </div>

      <section className={cn(panelBox, 'overflow-hidden')}>
        <TaskFilters
          value={filters}
          onChange={patch => setFilters(cur => ({ ...cur, ...patch }))}
          categories={categories}
        />

        {filters.view === 'list' ? (
          <>
            <TaskList
              tasks={paginated}
              hasAny={typed.length > 0}
              filtered={isFiltering}
              onOpen={t => setDetailId(t.id)}
              onToggle={toggleDone}
              canChangeStatus={canChangeStatus}
              canCreate={canCreate}
              onCreate={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            />
            {filtered.length > pageSize && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">
                  صفحه { (pageIndex + 1).toLocaleString('fa-IR')} از { totalPages.toLocaleString('fa-IR')} — {filtered.length.toLocaleString('fa-IR')} کار
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="xs" disabled={pageIndex === 0} onClick={() => setPageIndex(p => Math.max(0, p - 1))}>قبلی</Button>
                  <Button type="button" variant="outline" size="xs" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(p => Math.min(totalPages - 1, p + 1))}>بعدی</Button>
                </div>
              </div>
            )}
          </>
        ) : filters.view === 'kanban' ? (
          <>
            <TaskKanban tasks={paginated} onOpen={t => setDetailId(t.id)} onMove={moveTask} canChangeStatus={canChangeStatus} />
            {filtered.length > pageSize && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-400">
                  صفحه { (pageIndex + 1).toLocaleString('fa-IR')} از { totalPages.toLocaleString('fa-IR')} — {filtered.length.toLocaleString('fa-IR')} کار
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="xs" disabled={pageIndex === 0} onClick={() => setPageIndex(p => Math.max(0, p - 1))}>قبلی</Button>
                  <Button type="button" variant="outline" size="xs" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(p => Math.min(totalPages - 1, p + 1))}>بعدی</Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <TaskGantt tasks={filtered} onOpen={t => setDetailId(t.id)} />
        )}
      </section>

      {showPomo && (
        <div className="pomo-floating-container">
          <PomodoroTimer
            taskId={activePomoTask?.id}
            taskTitle={activePomoTask?.title}
            onTimeLogged={logTimeForTask}
            onClose={() => setShowPomo(false)}
          />
        </div>
      )}

      {formOpen && (
        <TaskForm
          initial={editing}
          typeDefault={tab}
          categories={categories}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSave={saveTask}
          canChangeStatus={canChangeStatus}
        />
      )}

      {detailTask && (
        <TaskDetails
          task={detailTask}
          users={users}
          onClose={() => setDetailId(null)}
          onToggle={toggleDone}
          onEdit={t => {
            setDetailId(null)
            setEditing(t)
            setFormOpen(true)
          }}
          onDelete={deleteTask}
          canChangeStatus={canChangeStatus}
          canEdit={canEdit}
          canDelete={canDelete}
          onStartPomo={canEdit ? t => {
            setActivePomoTask(t)
            setShowPomo(true)
          } : undefined}
        />
      )}
    </>
  )
}
