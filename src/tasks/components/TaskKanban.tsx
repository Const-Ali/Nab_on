import { useState } from 'react'
import { isOverdue, overdueDays } from '../utils'
import { taskPriorityTones, taskStatusLabels } from '../types'
import type { TaskStatus, WorkTask } from '../types'

const columns: TaskStatus[] = ['todo', 'in_progress', 'completed']

interface Props {
  tasks: WorkTask[]
  onOpen: (t: WorkTask) => void
  onMove: (id: string, status: TaskStatus) => void
}

export default function TaskKanban({ tasks, onOpen, onMove }: Props) {
  const [over, setOver] = useState<TaskStatus | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  return (
    <div className="wm-kanban">
      {columns.map(col => {
        const list = tasks.filter(t => t.status === col)
        return (
          <section
            key={col}
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
            {list.length === 0 && <div className="wm-col-empty">کاری اینجا نیست — بکشید و رها کنید</div>}
            {list.map(t => {
              const late = isOverdue(t)
              return (
                <article
                  key={t.id}
                  className={`wm-kcard ${t.status === 'completed' ? 'done' : ''}`}
                  draggable
                  onDragStart={e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; setDragId(t.id) }}
                  onDragEnd={() => { setDragId(null); setOver(null) }}
                  onClick={() => onOpen(t)}
                >
                  <div className="wm-kcard-top">
                    <i className={`wm-dot pr-${taskPriorityTones[t.priority]}`} />
                    <b>{t.title}</b>
                  </div>
                  {t.category && <small className="wm-kcard-cat">{t.category}</small>}
                  <div className="wm-kcard-bottom">
                    {t.dueDate && <time className={late ? 'late' : ''}>{late ? `${overdueDays(t).toLocaleString('fa-IR')} روز تأخیر` : t.dueDate.replace(/(\d)/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}</time>}
                  </div>
                </article>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
