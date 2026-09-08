import { useMemo } from 'react'
import { jalaliMonthNames, jalaliParts, toPersianDigits } from '../../shared'
import { taskPriorityTones, taskStatusLabels } from '../types'
import type { WorkTask } from '../types'

interface Props {
  tasks: WorkTask[]
  onOpen: (t: WorkTask) => void
}

export default function TaskGantt({ tasks, onOpen }: Props) {
  const todayJ = jalaliParts(new Date())

  // Create 30 days window centered around today
  const days = useMemo(() => {
    const list: { y: number; m: number; d: number; label: string; dateStr: string; isToday: boolean }[] = []
    const curYear = todayJ.y
    const curMonth = todayJ.m
    const maxDays = curMonth <= 6 ? 31 : curMonth <= 11 ? 30 : 29

    for (let d = 1; d <= maxDays; d++) {
      const dateStr = `${curYear}/${String(curMonth).padStart(2, '0')}/${String(d).padStart(2, '0')}`
      const isToday = curYear === todayJ.y && curMonth === todayJ.m && d === todayJ.d
      list.push({
        y: curYear,
        m: curMonth,
        d,
        label: String(d),
        dateStr,
        isToday,
      })
    }
    return list
  }, [todayJ.y, todayJ.m, todayJ.d])

  const parseDayIndex = (dateStr?: string) => {
    if (!dateStr) return null
    const parts = dateStr.split('/').map(Number)
    if (parts.length !== 3) return null
    if (parts[0] === todayJ.y && parts[1] === todayJ.m) {
      return Math.max(1, Math.min(days.length, parts[2])) - 1
    }
    // If from earlier or later
    if (parts[0] < todayJ.y || (parts[0] === todayJ.y && parts[1] < todayJ.m)) return 0
    if (parts[0] > todayJ.y || (parts[0] === todayJ.y && parts[1] > todayJ.m)) return days.length - 1
    return null
  }

  return (
    <div className="wm-gantt-wrap" dir="rtl">
      <div className="wm-gantt-header-banner">
        <b>📊 تایم‌لاین و گانت‌چارت کارها · {jalaliMonthNames[todayJ.m - 1]} {toPersianDigits(todayJ.y)}</b>
        <small>نمایش بازه زمانی، مهلت انجام و پیشرفت تسک‌ها روی خط زمان</small>
      </div>

      <div className="wm-gantt-container">
        {/* Left column: Task list */}
        <div className="wm-gantt-tasks-col">
          <div className="wm-gantt-cell-head">عنوان کار</div>
          {tasks.map(t => (
            <div
              key={t.id}
              className="wm-gantt-task-item"
              onClick={() => onOpen(t)}
              title={`${t.title} (${taskStatusLabels[t.status]})`}
            >
              <i className={`wm-dot pr-${taskPriorityTones[t.priority]}`} />
              <span className={`wm-gantt-task-name ${t.status === 'completed' ? 'done' : ''}`}>
                {t.title}
              </span>
              <small className={`wm-chip st-${t.status}`}>{taskStatusLabels[t.status]}</small>
            </div>
          ))}
          {tasks.length === 0 && <div className="empty">کاری برای نمایش وجود ندارد</div>}
        </div>

        {/* Right timeline grid */}
        <div className="wm-gantt-grid-col">
          <div className="wm-gantt-days-head">
            {days.map(d => (
              <div
                key={d.dateStr}
                className={`wm-gantt-day-head ${d.isToday ? 'today' : ''}`}
                title={`${d.d} ${jalaliMonthNames[d.m - 1]}`}
              >
                <span>{toPersianDigits(d.d)}</span>
                {d.isToday && <em className="today-badge">امروز</em>}
              </div>
            ))}
          </div>

          <div className="wm-gantt-rows">
            {tasks.map(t => {
              const sIdx = parseDayIndex(t.startDate) ?? parseDayIndex(t.dueDate) ?? (todayJ.d - 1)
              const eIdx = parseDayIndex(t.dueDate) ?? sIdx
              const startPos = Math.min(sIdx, eIdx)
              const span = Math.max(1, Math.abs(eIdx - sIdx) + 1)
              const cellWidthPercent = 100 / days.length
              const leftPercent = startPos * cellWidthPercent
              const widthPercent = span * cellWidthPercent

              return (
                <div key={t.id} className="wm-gantt-row">
                  {/* Today vertical line */}
                  <div
                    className="wm-gantt-today-line"
                    style={{ left: `${(todayJ.d - 1) * cellWidthPercent + cellWidthPercent / 2}%` }}
                  />

                  {/* Task timeline bar */}
                  <div
                    className={`wm-gantt-bar pr-${taskPriorityTones[t.priority]} st-${t.status}`}
                    style={{
                      right: `${leftPercent}%`,
                      width: `${Math.min(100 - leftPercent, widthPercent)}%`,
                    }}
                    onClick={() => onOpen(t)}
                    title={`${t.title} | از ${t.startDate || '—'} تا ${t.dueDate || '—'}`}
                  >
                    <span className="wm-gantt-bar-title">{t.title}</span>
                    {t.dueDate && <small className="wm-gantt-bar-due">{toPersianDigits(t.dueDate.slice(5))}</small>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
