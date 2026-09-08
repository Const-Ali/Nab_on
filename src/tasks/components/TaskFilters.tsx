import { useState } from 'react'
import { Icon } from '../../shared-ui'
import { taskPriorityFilterOptions, taskSortOptions, taskStatusFilterOptions } from '../types'
import type { TaskFilterState } from '../types'

interface Props {
  value: TaskFilterState
  onChange: (patch: Partial<TaskFilterState>) => void
  categories: string[]
}

export default function TaskFilters({ value, onChange, categories }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="wm-filters">
      <div className="wm-filters-top">
        <div className="search"><Icon name="search" /><input value={value.q} onChange={e => onChange({ q: e.target.value })} placeholder="جستجو در عنوان، توضیحات، دسته یا برچسب..." /></div>
        <div className="wm-view-toggle">
          <button type="button" className={value.view === 'list' ? 'on' : ''} onClick={() => onChange({ view: 'list' })} title="نمای لیست">☰ لیست</button>
          <button type="button" className={value.view === 'kanban' ? 'on' : ''} onClick={() => onChange({ view: 'kanban' })} title="نمای کانبان">▦ کانبان</button>
        </div>
        <button type="button" className="wm-filters-toggle" onClick={() => setOpen(o => !o)}>{open ? 'بستن فیلترها ▲' : 'فیلترها ▼'}</button>
      </div>
      <div className={`wm-filters-body ${open ? 'open' : ''}`}>
        <select value={value.status} onChange={e => onChange({ status: e.target.value })}>
          {taskStatusFilterOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={value.priority} onChange={e => onChange({ priority: e.target.value })}>
          {taskPriorityFilterOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={value.category} onChange={e => onChange({ category: e.target.value })}>
          <option value="all">همه دسته‌ها</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={value.sort} onChange={e => onChange({ sort: e.target.value })}>
          {taskSortOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {(value.status !== 'all' || value.priority !== 'all' || value.category !== 'all' || value.q) && (
          <button type="button" className="mini-btn" onClick={() => onChange({ q: '', status: 'all', priority: 'all', category: 'all' })}>پاک کردن فیلترها ✕</button>
        )}
      </div>
    </div>
  )
}
