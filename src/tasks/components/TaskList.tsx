import TaskCard from './TaskCard'
import type { WorkTask } from '../types'

interface Props {
  tasks: WorkTask[]
  hasAny: boolean
  filtered: boolean
  onOpen: (t: WorkTask) => void
  onToggle: (t: WorkTask) => void
  onCreate: () => void
}

export default function TaskList({ tasks, hasAny, filtered, onOpen, onToggle, onCreate }: Props) {
  if (tasks.length === 0) {
    if (hasAny && filtered) return <div className="empty">هیچ کاری با این فیلترها پیدا نشد</div>
    return (
      <div className="wm-empty">
        <span className="wm-empty-ico">✓</span>
        <b>هنوز کاری ثبت نشده است</b>
        <p>اولین کار خود را بسازید؛ کارهای شما خصوصی است و فقط خودتان می‌بینید.</p>
        <button type="button" className="primary" onClick={onCreate}>+ ایجاد اولین کار</button>
      </div>
    )
  }
  return (
    <div className="wm-list">
      {tasks.map(t => <TaskCard key={t.id} task={t} onOpen={onOpen} onToggle={onToggle} />)}
    </div>
  )
}
