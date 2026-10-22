import { Button } from '../../components/common/Button'
import { cn, focusRing, transition } from '../../components/ui'
import { isOverdue, overdueDays } from '../utils'
import { taskPriorityLabels, taskPriorityTones, taskStatusLabels } from '../types'
import type { WorkTask } from '../types'

const statusTone: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  in_progress: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  cancelled: 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800',
}
const priorityTone: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  red: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
}

export default function TaskCard({ task, onOpen, onToggle, canToggle = true }: { task: WorkTask; onOpen: (t: WorkTask) => void; onToggle: (t: WorkTask) => void; canToggle?: boolean }) {
  const done = task.status === 'completed'
  const late = isOverdue(task)
  const toggleLabel = done ? 'بازگشایی کار' : 'تکمیل کار'

  return (
    <article className={cn('group flex items-stretch gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 sm:gap-3 sm:px-4 sm:py-3 dark:border-slate-800', transition, done && 'opacity-75')}>
      {canToggle && <Button
        type="button"
        aria-label={toggleLabel + ': ' + task.title}
        aria-pressed={done}
        title={toggleLabel}
        onClick={() => onToggle(task)}
        className={cn(
          'my-auto min-h-10 min-w-10 shrink-0 rounded-full border-2 px-2.5 py-1 text-xs font-semibold sm:min-h-9 sm:min-w-9',
          done
            ? 'border-emerald-500 bg-emerald-500 text-white hover:border-emerald-600 hover:bg-emerald-600'
            : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300',
          focusRing,
        )}
      >
        {done ? '✓' : 'تکمیل'}
      </Button>}

      <Button
        type="button"
        variant="unstyled"
        size="none"
        className="flex min-w-0 flex-1 flex-col items-stretch justify-between gap-2 rounded-lg px-2 py-2 text-right hover:bg-slate-50 dark:hover:bg-slate-800/50 sm:flex-row sm:items-center sm:gap-3"
        onClick={() => onOpen(task)}
        aria-label={`جزئیات کار: ${task.title}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
            <h3 className={cn('truncate text-sm font-semibold text-slate-900 dark:text-slate-100', done && 'line-through')}>
              {task.title}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-semibold', statusTone[task.status])}>{taskStatusLabels[task.status]}</span>
              <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-semibold', priorityTone[taskPriorityTones[task.priority]])}>{taskPriorityLabels[task.priority]}</span>
            </div>
          </div>
          {task.description && <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            {task.category && <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">{task.category}</span>}
            {task.tags.slice(0, 3).map(tag => <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">#{tag}</span>)}
          </div>
        </div>
        <div className="shrink-0 text-right text-xs sm:text-left">
          <time className={cn('block whitespace-nowrap text-slate-500 dark:text-slate-400', late && 'font-bold text-rose-600 dark:text-rose-300')}>
            {task.dueDate || 'بدون مهلت'}
          </time>
          {late && <span className="mt-1 block text-[11px] font-medium text-rose-600 dark:text-rose-300">{overdueDays(task).toLocaleString('fa-IR')} روز تأخیر</span>}
        </div>
      </Button>
    </article>
  )
}
