import { Icon } from '../../shared-ui'
import { isOverdue, overdueDays } from '../utils'
import { taskPriorityLabels, taskPriorityTones, taskStatusLabels, taskTypeLabels } from '../types'
import type { UserLite, WorkTask } from '../types'

interface Props {
  task: WorkTask
  users: UserLite[]
  onClose: () => void
  onToggle: (t: WorkTask) => void
  onEdit: (t: WorkTask) => void
  onDelete: (t: WorkTask) => void
}

export default function TaskDetails({ task, users, onClose, onToggle, onEdit, onDelete }: Props) {
  const done = task.status === 'completed'
  const late = isOverdue(task)
  const faDate = (v: string) => (v ? v.replace(/(\d)/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) : '—')
  const nameOf = (u: string) => users.find(x => x.username === u)?.name ?? u
  return (
    <div className="backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal wm-details">
        <button type="button" className="x" onClick={onClose}><Icon name="close" /></button>
        <div className="wm-details-head">
          <span>
            <small>{taskTypeLabels[task.type]} · {task.id}</small>
            <h2>{task.title}</h2>
          </span>
          <i className={`wm-chip st-${task.status}`}>{taskStatusLabels[task.status]}</i>
        </div>
        {late && <div className="wm-late-banner">این کار {overdueDays(task).toLocaleString('fa-IR')} روز از موعد خود گذشته است ⚠</div>}
        <div className="wm-meta">
          <div><small>اولویت</small><b><i className={`wm-dot pr-${taskPriorityTones[task.priority]}`} /> {taskPriorityLabels[task.priority]}</b></div>
          <div><small>ایجادکننده</small><b>{task.createdByName || nameOf(task.createdBy)}</b></div>
          <div><small>تاریخ ایجاد</small><b>{task.createdAt || '—'}</b></div>
          <div><small>تاریخ شروع</small><b>{faDate(task.startDate)}</b></div>
          <div><small>مهلت انجام</small><b className={late ? 'late' : ''}>{faDate(task.dueDate)}</b></div>
          <div><small>دسته‌بندی</small><b>{task.category || '—'}</b></div>
          <div><small>تکمیل در</small><b>{task.completedAt ?? '—'}</b></div>
        </div>
        {task.description && <p className="wm-desc">{task.description}</p>}
        {task.note && <div className="wm-note"><small>توضیحات تکمیلی</small>{task.note}</div>}
        {task.tags.length > 0 && <div className="wm-tags">{task.tags.map(t => <i className="wm-chip tag" key={t}>#{t}</i>)}</div>}
        <h3 className="modal-h">تاریخچه فعالیت</h3>
        <div className="wm-history">
          {[...task.history].reverse().map(h => (
            <div className="wm-hrow" key={h.id}>
              <i className="wm-hdot" />
              <span><b>{h.action}</b><small>{h.createdBy} · {h.createdAt}</small></span>
            </div>
          ))}
          {task.history.length === 0 && <div className="empty">رویدادی ثبت نشده است</div>}
        </div>
        <div className="modal-actions wm-detail-actions">
          <button type="button" className="outline danger-lite" onClick={() => onDelete(task)}>حذف کار</button>
          <span className="wm-spacer" />
          <button type="button" className="outline" onClick={() => onEdit(task)}><Icon name="edit" /> ویرایش</button>
          <button type="button" className="primary" onClick={() => onToggle(task)}><Icon name="check" /> {done ? 'بازگشایی کار' : 'تکمیل کار'}</button>
        </div>
      </div>
    </div>
  )
}
