import { isOverdue, overdueDays } from '../utils'
import { taskPriorityLabels, taskPriorityTones, taskStatusLabels } from '../types'
import type { WorkTask } from '../types'

interface Props {
  task: WorkTask
  onOpen: (t: WorkTask) => void
  onToggle: (t: WorkTask) => void
}

export default function TaskCard({ task, onOpen, onToggle }: Props) {
  const done = task.status === 'completed'
  const inProgress = task.status === 'in_progress'
  const overdue = isOverdue(task)

  return (
    <div className={`wm-task ${done ? 'done' : ''}`} onClick={() => onOpen(task)}>
      {/* دکمه اختصاصی تغییر وضعیت — جایگزین تیک ساده مرورگر */}
      <button
        type="button"
        className={`wm-status-btn ${done ? 'done' : inProgress ? 'progress' : task.status === 'cancelled' ? 'cancelled' : 'todo'}`}
        onClick={e => {
          e.stopPropagation()
          onToggle(task)
        }}
        title={done ? 'تغییر به انجام‌نشده (بازگشایی)' : 'تغییر به تکمیل‌شده'}
        aria-label={done ? 'بازگشایی کار' : 'تکمیل کار'}
      >
        {done ? (
          <svg viewBox="0 0 20 20" className="h-[13px] w-[13px]" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
          </svg>
        ) : inProgress ? (
          <>
            <span className="wm-status-dot" />
            <svg viewBox="0 0 20 20" className="wm-status-hover-check h-[13px] w-[13px]" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
            </svg>
          </>
        ) : (
          <svg viewBox="0 0 20 20" className="wm-status-hover-check h-[13px] w-[13px]" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <div className="wm-task-main">
        <b>{task.title}</b>
        {task.description && (
          <small>{task.description.length > 90 ? `${task.description.slice(0, 90)}…` : task.description}</small>
        )}
        <div className="wm-task-chips">
          <i className={`wm-chip st-${task.status}`}>{taskStatusLabels[task.status]}</i>
          <i className={`wm-chip pr-${taskPriorityTones[task.priority]}`}>● {taskPriorityLabels[task.priority]}</i>
          {task.category && <i className="wm-chip cat">{task.category}</i>}
          {task.tags.slice(0, 2).map(t => <i className="wm-chip tag" key={t}>#{t}</i>)}
          {task.tags.length > 2 && <i className="wm-chip tag">+{(task.tags.length - 2).toLocaleString('fa-IR')}</i>}
        </div>
      </div>

      <div className="wm-task-side">
        {task.dueDate && <time className={overdue ? 'late' : ''}>{task.dueDate.replace(/(\d)/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}</time>}
        {overdue && <em className="wm-late">{overdueDays(task).toLocaleString('fa-IR')} روز تأخیر</em>}
        <button
          type="button"
          className={`wm-quick-btn ${done ? 'reopen' : 'complete'}`}
          onClick={e => {
            e.stopPropagation()
            onToggle(task)
          }}
        >
          {done ? '↺ بازگشایی' : '✓ تکمیل'}
        </button>
      </div>
    </div>
  )
}
