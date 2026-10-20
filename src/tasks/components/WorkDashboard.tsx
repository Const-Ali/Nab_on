import { Button } from '../../components/common/Button'
import { isDueToday, isHighPriority, isOverdue } from '../utils'
import type { QuickFilter, WorkTask } from '../types'

export default function WorkDashboard({ tasks, quick, onQuick }: { tasks: WorkTask[]; quick: QuickFilter; onQuick: (q: QuickFilter) => void }) {
  const cards: [QuickFilter, string, number][] = [
    ['all', 'همه کارها', tasks.length],
    ['today', 'امروز', tasks.filter(isDueToday).length],
    ['in_progress', 'در حال انجام', tasks.filter(t => t.status === 'in_progress').length],
    ['completed', 'تکمیل‌شده', tasks.filter(t => t.status === 'completed').length],
    ['overdue', 'عقب‌افتاده', tasks.filter(isOverdue).length],
    ['high', 'اولویت بالا', tasks.filter(isHighPriority).length],
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map(([id, label, value]) => (
        <Button
          key={id}
          type="button"
          variant="card"
          size="none"
          active={quick === id}
          aria-label={`${label}: ${value.toLocaleString('fa-IR')} کار`}
          onClick={() => onQuick(quick === id && id !== 'all' ? 'all' : id)}
          className="min-h-24 w-full flex-col items-stretch rounded-2xl p-4 text-right shadow-sm hover:-translate-y-0.5 sm:min-h-28"
        >
          <span className="mt-2 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
          <b className="mt-1 block text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{value.toLocaleString('fa-IR')}</b>
        </Button>
      ))}
    </div>
  )
}
