import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/common/Button'
import { jalaliJdn, jalaliMonthNames, jalaliParts, normalizeDigits, toPersianDigits } from '../../shared'
import { taskPriorityLabels, taskPriorityTones, taskStatusLabels } from '../types'
import type { WorkTask } from '../types'

interface Props {
  tasks: WorkTask[]
  onOpen: (t: WorkTask) => void
}

function addJalaliMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const total = (y * 12 + (m - 1)) + delta
  const ny = Math.floor(total / 12)
  let nm = (total % 12) + 1
  if (nm < 1) { nm += 12 }
  return { y: ny, m: nm }
}

export default function TaskGantt({ tasks, onOpen }: Props) {
  const todayJ = jalaliParts(new Date())
  const todayDayRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  const viewJ = useMemo(() => addJalaliMonths(todayJ.y, todayJ.m, offset), [todayJ.y, todayJ.m, offset])
  const isCurrentMonth = offset === 0

  const days = useMemo(() => {
    const list: { y: number; m: number; d: number; label: string; dateStr: string; isToday: boolean }[] = []
    const curYear = viewJ.y
    const curMonth = viewJ.m
    const next = addJalaliMonths(curYear, curMonth, 1)
    const maxDays = jalaliJdn(next.y, next.m, 1) - jalaliJdn(curYear, curMonth, 1)

    for (let d = 1; d <= maxDays; d++) {
      const dateStr = `${curYear}/${String(curMonth).padStart(2, '0')}/${String(d).padStart(2, '0')}`
      const isToday = isCurrentMonth && curYear === todayJ.y && curMonth === todayJ.m && d === todayJ.d
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
  }, [viewJ.y, viewJ.m, isCurrentMonth, todayJ.y, todayJ.m, todayJ.d])

  const firstJdn = useMemo(() => jalaliJdn(viewJ.y, viewJ.m, 1), [viewJ.y, viewJ.m])
  const lastJdn = useMemo(() => firstJdn + days.length - 1, [firstJdn, days.length])

  useEffect(() => {
    if (isCurrentMonth) todayDayRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [days.length, todayJ.d, isCurrentMonth])

  const jalaliStringToJdn = (value?: string): number | null => {
    if (!value) return null
    const normalized = normalizeDigits(value.trim())
    const parts = normalized.split('/').map(Number)
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n) || n <= 0)) return null
    const [y, m, d] = parts
    // Basic range guard; jalaliJdn will still compute but we validate month/day bounds elsewhere
    if (m < 1 || m > 12 || d < 1 || d > 31) return null
    try {
      return jalaliJdn(y, m, d)
    } catch {
      return null
    }
  }

  const getGanttBarInfo = (t: WorkTask) => {
    const hasStart = Boolean(t.startDate?.trim())
    const hasDue = Boolean(t.dueDate?.trim())
    const startJdn = jalaliStringToJdn(t.startDate)
    const dueJdn = jalaliStringToJdn(t.dueDate)

    // Invalid order: start after due
    if (startJdn !== null && dueJdn !== null && startJdn > dueJdn) {
      return { kind: 'invalid' as const, startJdn, dueJdn }
    }

    // No dates at all
    if (!hasStart && !hasDue) {
      return { kind: 'no-date' as const }
    }

    // If dates are invalid strings but present, treat as no-date to avoid fake placement
    // (validJalaliDate already guards form, but legacy data may contain garbage)
    if (hasStart && startJdn === null && hasDue && dueJdn === null) {
      return { kind: 'no-date' as const }
    }

    // Determine task interval
    // eslint-disable-next-line no-useless-assignment
    let taskStart: number | null = null
    // eslint-disable-next-line no-useless-assignment
    let taskEnd: number | null = null
    if (startJdn !== null && dueJdn !== null) {
      taskStart = startJdn
      taskEnd = dueJdn
    } else if (startJdn !== null) {
      taskStart = startJdn
      taskEnd = startJdn
    } else if (dueJdn !== null) {
      taskStart = dueJdn
      taskEnd = dueJdn
    } else {
      return { kind: 'no-date' as const }
    }

    if (taskStart === null || taskEnd === null) return { kind: 'no-date' as const }

    // Check overlap with current month
    const visibleStart = Math.max(taskStart, firstJdn)
    const visibleEnd = Math.min(taskEnd, lastJdn)
    if (visibleStart > visibleEnd) {
      // Completely outside current month
      const isBefore = taskEnd < firstJdn
      const isAfter = taskStart > lastJdn
      return { kind: 'outside' as const, isBefore, isAfter, startJdn, dueJdn }
    }

    const startIdx = visibleStart - firstJdn
    const span = visibleEnd - visibleStart + 1
    const isClipped = taskStart < firstJdn || taskEnd > lastJdn
    return { kind: 'bar' as const, startIdx, span, isClipped, startJdn, dueJdn }
  }

  return (
    <div className="wm-gantt-wrap" dir="rtl">
      <div className="wm-gantt-header-banner">
        <b> تایم‌لاین و گانت‌چارت کارها · {jalaliMonthNames[viewJ.m - 1]} {toPersianDigits(viewJ.y)}</b>
        <small>نمایش بازه زمانی، مهلت انجام و پیشرفت تسک‌ها روی خط زمان</small>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="xs" onClick={() => setOffset(o => o - 1)} title="ماه قبلی">‹ ماه قبل</Button>
          <Button type="button" variant="outline" size="xs" onClick={() => setOffset(0)} disabled={offset === 0} title="بازگشت به ماه جاری">امروز</Button>
          <Button type="button" variant="outline" size="xs" onClick={() => setOffset(o => o + 1)} title="ماه بعدی">ماه بعد ›</Button>
        </div>
        <span className="text-slate-600 dark:text-slate-300">{jalaliMonthNames[viewJ.m - 1]} {toPersianDigits(viewJ.y)} {isCurrentMonth ? '(ماه جاری)' : ''}</span>
      </div>
      <p className="wm-gantt-scroll-hint" role="note">برای دیدن روزهای بیشتر، جدول زمان‌بندی را به‌صورت افقی بکشید.</p>

      <div className="wm-gantt-container" role="region" aria-label="نمودار زمان‌بندی کارها؛ برای دیدن روزهای دیگر افقی پیمایش کنید" tabIndex={0}>
        {/* Left column: Task list */}
        <div className="wm-gantt-tasks-col">
          <div className="wm-gantt-cell-head">عنوان کار</div>
          {tasks.map(t => (
            <Button
              key={t.id}
              type="button"
              variant="ghost"
              size="none"
              className="wm-gantt-task-item"
              onClick={() => onOpen(t)}
              title={`${t.title} (${taskStatusLabels[t.status]})`}
              aria-label={`نمایش جزئیات کار: ${t.title}، ${taskStatusLabels[t.status]}`}
            >
              <small>اولویت: {taskPriorityLabels[t.priority]}</small>
              <span className={`wm-gantt-task-name ${t.status === 'completed' ? 'done' : ''}`}>
                {t.title}
              </span>
              <small className={`wm-chip st-${t.status}`}>{taskStatusLabels[t.status]}</small>
            </Button>
          ))}
          {tasks.length === 0 && <div className="wm-gantt-empty">کاری برای نمایش وجود ندارد</div>}
        </div>

        {/* Right timeline grid */}
        <div className="wm-gantt-grid-col">
          <div className="wm-gantt-days-head" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(28px, 1fr))` }}>
            {days.map(d => (
              <div
                key={d.dateStr}
                ref={d.isToday ? todayDayRef : undefined}
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
              const info = getGanttBarInfo(t)
              const cellWidthPercent = 100 / days.length

              // No-date placeholder
              if (info.kind === 'no-date') {
                return (
                  <div key={t.id} className="wm-gantt-row" style={{ backgroundSize: `${cellWidthPercent}% 100%` }}>
                    {isCurrentMonth && <div className="wm-gantt-today-line" style={{ right: `${(todayJ.d - 0.5) * cellWidthPercent}%` }} />}
                    <div className="wm-gantt-no-date" title="این کار تاریخ شروع/مهلت ندارد">
                      <span className="wm-gantt-no-date-badge">بدون تاریخ</span>
                      <small>برای نمایش در گانت، تاریخ شروع یا مهلت تعیین کنید — {toPersianDigits(t.startDate || t.dueDate || '—')}</small>
                    </div>
                  </div>
                )
              }

              if (info.kind === 'invalid') {
                return (
                  <div key={t.id} className="wm-gantt-row" style={{ backgroundSize: `${cellWidthPercent}% 100%` }}>
                    {isCurrentMonth && <div className="wm-gantt-today-line" style={{ right: `${(todayJ.d - 0.5) * cellWidthPercent}%` }} />}
                    <button
                      type="button"
                      className="wm-gantt-bar st-invalid"
                      onClick={() => onOpen(t)}
                      title={`بازه نامعتبر: از ${t.startDate || '—'} تا ${t.dueDate || '—'} — تاریخ پایان قبل از شروع است`}
                      aria-label={`بازه نامعتبر: ${t.title}`}
                    >
                      <span className="wm-gantt-bar-title">بازه نامعتبر</span>
                      <small className="wm-gantt-bar-due">{toPersianDigits(`${t.startDate || '—'} → ${t.dueDate || '—'}`)}</small>
                    </button>
                  </div>
                )
              }

              if (info.kind === 'outside') {
                const label = info.isBefore ? 'ماه قبل' : info.isAfter ? 'ماه آینده' : 'خارج از ماه جاری'
                return (
                  <div key={t.id} className="wm-gantt-row" style={{ backgroundSize: `${cellWidthPercent}% 100%` }}>
                    {isCurrentMonth && <div className="wm-gantt-today-line" style={{ right: `${(todayJ.d - 0.5) * cellWidthPercent}%` }} />}
                    <div className="wm-gantt-outside" title={`خارج از ${jalaliMonthNames[viewJ.m - 1]} ${toPersianDigits(viewJ.y)}: ${t.startDate || '—'} تا ${t.dueDate || '—'}`}>
                      <span className="wm-gantt-outside-badge">{label}</span>
                      <small>{toPersianDigits(`${t.startDate || '—'} → ${t.dueDate || '—'}`)}</small>
                    </div>
                  </div>
                )
              }

              // Normal bar
              const leftPercent = info.startIdx * cellWidthPercent
              const widthPercent = info.span * cellWidthPercent

              return (
                <div
                  key={t.id}
                  className="wm-gantt-row"
                  style={{ backgroundSize: `${cellWidthPercent}% 100%` }}
                >
                  {/* Today vertical line */}
                  {isCurrentMonth && <div
                    className="wm-gantt-today-line"
                    style={{ right: `${(todayJ.d - 0.5) * cellWidthPercent}%` }}
                  />}

                  {/* Task timeline bar */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="none"
                    className={`wm-gantt-bar pr-${taskPriorityTones[t.priority]} st-${t.status}${info.isClipped ? ' clipped' : ''}`}
                    style={{
                      right: `${leftPercent}%`,
                      width: `${Math.min(100 - leftPercent, widthPercent)}%`,
                    }}
                    onClick={() => onOpen(t)}
                    title={`${t.title} | از ${t.startDate || '—'} تا ${t.dueDate || '—'}${info.isClipped ? ' (بریده‌شده تا مرز ماه)' : ''}`}
                    aria-label={`نمایش جزئیات کار روی نمودار: ${t.title}`}
                  >
                    <span className="wm-gantt-bar-title">{t.title}</span>
                    {t.dueDate && <small className="wm-gantt-bar-due">{toPersianDigits(t.dueDate.slice(5))}</small>}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
