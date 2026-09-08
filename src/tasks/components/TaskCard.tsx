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
  const overdue = isOverdue(task)
  return (
    <div className={`wm-task ${done ? 'done' : ''}`} onClick={() => onOpen(task)}>
      <input
        type="checkbox"
        className="row-check"
        checked={done}
        title={done ? 'بازگشایی کار' : 'تکمیل کار'}
        onClick={e => e.stopPropagation()}
        onChange={() => onToggle(task)}
      />
      <div className="wm-task-main">
        <b>{task.title}</b>
        {task.description && <small>{task.description.length > 90 ? `${task.description.slice(0, 90)}…` : task.description}</small>}
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
      </div>
    </div>
  )
}
