import { isDueToday, isHighPriority, isOverdue } from '../utils'
import type { QuickFilter, WorkTask } from '../types'
import { cn, focusRing, transition } from '../../components/ui'

export default function WorkDashboard({ tasks, quick, onQuick }: { tasks: WorkTask[]; quick: QuickFilter; onQuick: (q: QuickFilter) => void }) {
  const cards: [QuickFilter, string, number][] = [
    ['all', 'همه کارها', tasks.length],
    ['today', 'امروز', tasks.filter(isDueToday).length],
    ['in_progress', 'در حال انجام', tasks.filter(t => t.status === 'in_progress').length],
    ['completed', 'تکمیل‌شده', tasks.filter(t => t.status === 'completed').length],
    ['overdue', 'عقب‌افتاده', tasks.filter(isOverdue).length],
    ['high', 'اولویت بالا', tasks.filter(isHighPriority).length],
  ]
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{cards.map(([id, label, value]) => <button key={id} type="button" onClick={() => onQuick(quick === id && id !== 'all' ? 'all' : id)} className={cn('rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900', focusRing, transition, quick === id && 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950')}><span className="mt-3 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span><b className="mt-1 block text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{value.toLocaleString('fa-IR')}</b></button>)}</div>
}
