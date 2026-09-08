import { isDueToday, isHighPriority, isOverdue } from '../utils'
import type { QuickFilter, WorkTask } from '../types'

export default function WorkDashboard({ tasks, quick, onQuick }: { tasks: WorkTask[]; quick: QuickFilter; onQuick: (q: QuickFilter) => void }) {
  const cards: [QuickFilter, string, number, string][] = [
    ['all', 'کل کارها', tasks.length, 'blue'],
    ['today', 'کارهای امروز', tasks.filter(isDueToday).length, 'cyan'],
    ['in_progress', 'در حال انجام', tasks.filter(t => t.status === 'in_progress').length, 'purple'],
    ['completed', 'تکمیل‌شده', tasks.filter(t => t.status === 'completed').length, 'green'],
    ['overdue', 'عقب‌افتاده', tasks.filter(isOverdue).length, 'red'],
    ['high', 'اولویت بالا', tasks.filter(isHighPriority).length, 'amber'],
  ]
  return (
    <div className="wm-stats">
      {cards.map(([id, label, value, color]) => (
        <button
          type="button"
          key={id}
          className={`wm-stat ${color} ${quick === id ? 'on' : ''}`}
          onClick={() => onQuick(quick === id && id !== 'all' ? 'all' : id)}
          title={id === 'all' ? 'نمایش همه' : `فیلتر: ${label}`}
        >
          <span className="wm-stat-dot" />
          <span className="wm-stat-label">{label}</span>
          <b>{value.toLocaleString('fa-IR')}</b>
        </button>
      ))}
    </div>
  )
}
