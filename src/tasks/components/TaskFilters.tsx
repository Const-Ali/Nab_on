import { useState } from 'react'
import { Button } from '../../components/common/Button'
import { cn, selectCls } from '../../components/ui'
import { taskPriorityFilterOptions, taskSortOptions, taskStatusFilterOptions } from '../types'
import type { TaskFilterState } from '../types'

export default function TaskFilters({
  value,
  onChange,
  categories,
}: {
  value: TaskFilterState
  onChange: (patch: Partial<TaskFilterState>) => void
  categories: string[]
}) {
  const [open, setOpen] = useState(false)
  const active = value.status !== 'all' || value.priority !== 'all' || value.category !== 'all' || Boolean(value.q)

  return (
    <div className="border-b border-slate-100 p-4 dark:border-slate-800">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950">
          <input
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400 dark:text-white"
            value={value.q}
            onChange={e => onChange({ q: e.target.value })}
            placeholder="جست‌وجو در عنوان، توضیحات، دسته یا برچسب..."
            aria-label="جست‌وجو در کارها"
          />
        </div>

        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950" role="group" aria-label="نمایش کارها">
          {(['list', 'kanban', 'gantt'] as const).map(view => (
            <Button
              key={view}
              type="button"
              variant="tab"
              size="xs"
              active={value.view === view}
              className={value.view === view ? 'on' : ''}
              onClick={() => onChange({ view })}
            >
              {view === 'list' ? 'فهرست' : view === 'kanban' ? 'کانبان' : 'زمان‌بندی'}
            </Button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="xs"
          className="lg:hidden"
          onClick={() => setOpen(current => !current)}
          aria-expanded={open}
          aria-controls="task-filter-controls"
        >
          {open ? 'بستن فیلترها' : 'فیلترها'}
        </Button>
      </div>

      <div id="task-filter-controls" className={cn('grid grid-cols-1 gap-2 pt-3 sm:grid-cols-2 lg:grid-cols-4', !open && 'hidden lg:grid')}>
        <select className={selectCls} aria-label="فیلتر بر اساس وضعیت" value={value.status} onChange={e => onChange({ status: e.target.value })}>
          {taskStatusFilterOptions.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
        </select>
        <select className={selectCls} aria-label="فیلتر بر اساس اولویت" value={value.priority} onChange={e => onChange({ priority: e.target.value })}>
          {taskPriorityFilterOptions.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
        </select>
        <select className={selectCls} aria-label="فیلتر بر اساس دسته" value={value.category} onChange={e => onChange({ category: e.target.value })}>
          <option value="all">همه دسته‌ها</option>
          {categories.map(category => <option key={category} value={category}>{category}</option>)}
        </select>
        <div className="flex gap-2">
          <select className={selectCls} aria-label="مرتب‌سازی کارها" value={value.sort} onChange={e => onChange({ sort: e.target.value })}>
            {taskSortOptions.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
          </select>
          {active && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="shrink-0"
              onClick={() => onChange({ q: '', status: 'all', priority: 'all', category: 'all' })}
            >
              پاک‌سازی
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
