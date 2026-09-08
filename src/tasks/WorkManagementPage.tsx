import { useEffect, useMemo, useState } from 'react'
import { load, nowStamp, nowTs, playChime, save, uid } from '../shared'
import { Heading, Icon } from '../shared-ui'
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
  normalizeTask,
  sortTasks,
} from './utils'
import './tasks.css'

interface Props {
  users: UserLite[]
  sessionUsername: string
  sessionName: string
}

const defaultFilters: TaskFilterState = {
  q: '',
  status: 'all',
  priority: 'all',
  category: 'all',
  sort: 'newest',
  view: 'list',
}

export default function WorkManagementPage({ users, sessionUsername, sessionName }: Props) {
  const storeKey = `nab:tasks:${sessionUsername}`
  const [tasks, setTasks] = useState<WorkTask[]>(() => {
    const stored = load<unknown[]>(storeKey, [])
    if (stored.length) return stored.map(normalizeTask)
    const legacy = load<unknown[]>('nab:tasks', []).filter(raw => {
      const t = raw as { assignee?: string; createdBy?: string }
      return t.assignee === sessionUsername || t.createdBy === sessionUsername
    })
    return legacy.map(normalizeTask)
  })

  useEffect(() => {
    save(storeKey, tasks)
  }, [storeKey, tasks])

  const [tab, setTab] = useState<TaskType>('personal')
  const [quick, setQuick] = useState<QuickFilter>('all')
  const [filters, setFilters] = useState<TaskFilterState>(defaultFilters)
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

  const detailTask = detailId ? (mine.find(t => t.id === detailId) ?? null) : null
  const isFiltering =
    quick !== 'all' ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.category !== 'all' ||
    Boolean(filters.q)

  const log = (action: string) => ({ id: uid('TL'), action, createdAt: nowStamp(), createdBy: sessionName })

  const saveTask = (fields: TaskFields) => {
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
    if (!window.confirm(`کار «${t.title}» حذف شود؟ این عمل قابل بازگشت نیست.`)) return
    setTasks(cur => cur.filter(x => x.id !== t.id))
    setDetailId(null)
  }

  const logTimeForTask = (minutes: number) => {
    if (activePomoTask) {
      setTasks(cur =>
        cur.map(t =>
          t.id === activePomoTask.id
            ? {
                ...t,
                timeSpentMinutes: (t.timeSpentMinutes ?? 0) + minutes,
                history: [...t.history, log(`${minutes} دقیقه تمرکز با پومودورو ثبت شد`)],
              }
            : t,
        ),
      )
    }
  }

  const personalCount = mine.filter(t => t.type === 'personal').length
  const orgCount = mine.filter(t => t.type === 'organizational').length

  return (
    <>
      <Heading
        title="مدیریت کارهای من"
        subtitle="کارهای شخصی و سازمانی شما — همراه با تایم‌لاین، ماتریس اولویت و تایمر تمرکز پومودورو."
        action={
          <div className="flex items-center gap-[9px]">
            <button
              type="button"
              className="outline flex items-center gap-[6px]"
              onClick={() => {
                setShowPomo(p => !p)
                if (!showPomo && !activePomoTask && filtered.length > 0) {
                  setActivePomoTask(filtered[0])
                }
              }}
              title="تایمر تمرکز پومودورو"
            >
              🍅 تایمر پومودورو
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Icon name="plus" /> ایجاد کار جدید
            </button>
          </div>
        }
      />

      <WorkDashboard tasks={typed} quick={quick} onQuick={setQuick} />

      <div className="wm-tabs">
        <button type="button" className={tab === 'personal' ? 'on' : ''} onClick={() => setTab('personal')}>
          کارهای شخصی <em>{personalCount.toLocaleString('fa-IR')}</em>
        </button>
        <button type="button" className={tab === 'organizational' ? 'on' : ''} onClick={() => setTab('organizational')}>
          کارهای سازمانی <em>{orgCount.toLocaleString('fa-IR')}</em>
        </button>
      </div>

      <section className="panel wm-panel">
        <TaskFilters
          value={filters}
          onChange={patch => setFilters(cur => ({ ...cur, ...patch }))}
          categories={categories}
        />

        {filters.view === 'list' ? (
          <TaskList
            tasks={filtered}
            hasAny={typed.length > 0}
            filtered={isFiltering}
            onOpen={t => setDetailId(t.id)}
            onToggle={toggleDone}
            onCreate={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          />
        ) : filters.view === 'kanban' ? (
          <TaskKanban tasks={filtered} onOpen={t => setDetailId(t.id)} onMove={moveTask} />
        ) : (
          <TaskGantt tasks={filtered} onOpen={t => setDetailId(t.id)} />
        )}
      </section>

      {showPomo && (
        <div className="pomo-floating-container">
          <PomodoroTimer
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
          onStartPomo={t => {
            setActivePomoTask(t)
            setShowPomo(true)
          }}
        />
      )}
    </>
  )
}
