import { useState } from 'react'
import { isOverdue, overdueDays } from '../utils'
import { taskPriorityLabels, taskStatusLabels, taskStatusOrder } from '../types'
import type { TaskStatus, WorkTask } from '../types'

const columns: TaskStatus[] = ['todo', 'in_progress', 'completed', 'cancelled']

interface Props {
  tasks: WorkTask[]
  onOpen: (t: WorkTask) => void
  onMove: (id: string, status: TaskStatus) => void
}

export default function TaskKanban({ tasks, onOpen, onMove }: Props) {
  const [over, setOver] = useState<TaskStatus | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  return (
    <div className="wm-kanban" role="region" aria-label="ستون‌های کانبان کارها؛ برای دیدن ستون‌های دیگر افقی پیمایش کنید" tabIndex={0}>
      {columns.map(col => {
        const list = tasks.filter(t => t.status === col)
        return (
          <section
            key={col}
            aria-label={`${taskStatusLabels[col]}، ${list.length.toLocaleString('fa-IR')} کار`}
            className={`wm-col ${over === col ? 'drop-target' : ''}`}
            onDragOver={e => { e.preventDefault(); if (over !== col) setOver(col) }}
            onDragLeave={e => { if (e.currentTarget === e.target) setOver(null) }}
            onDrop={e => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain') || dragId
              if (id) onMove(id, col)
              setOver(null)
              setDragId(null)
            }}
          >
            <header className={`wm-col-head ${col}`}><b>{taskStatusLabels[col]}</b><em>{list.length.toLocaleString('fa-IR')}</em></header>
            {list.length === 0 && <div className="wm-col-empty">کاری در این مرحله نیست</div>}
            {list.map(t => {
              const late = isOverdue(t)
              return (
                <article
                  key={t.id}
                  className={`wm-kcard ${t.status === 'completed' ? 'done' : ''} ${t.status === 'cancelled' ? 'cancelled' : ''}`}
                  draggable
                  onDragStart={e => {
                    if ((e.target as HTMLElement).closest('.wm-kcard-status-wrap')) {
                      e.preventDefault()
                      return
                    }
                    e.dataTransfer.setData('text/plain', t.id)
                    e.dataTransfer.effectAllowed = 'move'
                    setDragId(t.id)
                  }}
                  onDragEnd={() => { setDragId(null); setOver(null) }}
                  onClick={() => onOpen(t)}
                >
                  <div className="wm-kcard-top">
                    <b>{t.title}</b>
                  </div>
                  <small className="wm-kcard-cat">اولویت: {taskPriorityLabels[t.priority]}{t.category ? ` · ${t.category}` : ''}</small>
                  <div className="wm-kcard-bottom">
                    {t.dueDate && <time className={late ? 'late' : ''}>{late ? `${overdueDays(t).toLocaleString('fa-IR')} روز تأخیر` : t.dueDate.replace(/(\d)/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}</time>}
                  </div>
                  <label className="wm-kcard-status-wrap" onClick={event => event.stopPropagation()}>
                    <span>وضعیت</span>
                    <select
                      className="wm-kcard-status"
                      value={t.status}
                      aria-label={`تغییر وضعیت ${t.title}`}
                      onChange={event => onMove(t.id, event.target.value as TaskStatus)}
                    >
                      {taskStatusOrder.map(status => <option key={status} value={status}>{taskStatusLabels[status]}</option>)}
                    </select>
                  </label>
                </article>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
