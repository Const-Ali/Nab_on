import { Button } from './components/common/Button'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { jalaliJdn, jalaliMonthNames, jalaliParts, jdnToDate, normalizeDigits } from './shared'
import { avatarBase, avatarSize, avatarTones, cn, focusRing, transition } from './components/ui'

export function Avatar({ text, tone = 'blue', src, size }: { text: string; tone?: string; src?: string; size?: number }) {
  const sizing = size ? (avatarSize[size] ?? avatarBase) : avatarBase
  return src
    ? <span className={cn(avatarBase, sizing, 'p-0')}><img className="block h-full w-full object-cover" src={src} alt="" /></span>
    : <span className={cn(avatarBase, sizing, avatarTones[tone] ?? avatarTones.blue)}>{text}</span>
}

export function Heading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
      <div className="min-w-0">
        <small className="text-xs font-medium text-slate-500 dark:text-slate-400">سامانه ناب</small>
        <h1 className="mt-1 break-words text-[1.375rem] font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl dark:text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-500 sm:text-sm dark:text-slate-400">{subtitle}</p>
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">{action}</div>}
    </div>
  )
}

export function MiniCalendar({
  activityDays,
  onPick,
  initialView,
  selectedDate,
}: {
  activityDays: Set<string>
  onPick?: (y: number, m: number, d: number) => void
  initialView?: { y: number; m: number }
  selectedDate?: string
}) {
  const todayJ = jalaliParts(new Date())
  const [view, setView] = useState(() => ({ y: initialView?.y ?? todayJ.y, m: initialView?.m ?? todayJ.m }))

  const selectedParts = useMemo(() => {
    if (!selectedDate) return null
    const clean = normalizeDigits(selectedDate.trim())
    const m = clean.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
    return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null
  }, [selectedDate])

  const startDay = useMemo(() => {
    return (jdnToDate(jalaliJdn(view.y, view.m, 1)).getDay() + 1) % 7 // شنبه = 0
  }, [view.y, view.m])

  const daysCount = useMemo(() => {
    if (view.m <= 6) return 31
    if (view.m <= 11) return 30
    return jalaliJdn(view.y + 1, 1, 1) - jalaliJdn(view.y, 12, 1)
  }, [view.y, view.m])

  const cells: ({ d: number; isToday: boolean; isSelected: boolean } | null)[] = useMemo(() => {
    const list: ({ d: number; isToday: boolean; isSelected: boolean } | null)[] = []
    for (let i = 0; i < startDay; i++) list.push(null)
    for (let d = 1; d <= daysCount; d++) {
      const isToday = view.y === todayJ.y && view.m === todayJ.m && d === todayJ.d
      const isSelected = selectedParts !== null && selectedParts.y === view.y && selectedParts.m === view.m && selectedParts.d === d
      list.push({ d, isToday, isSelected })
    }
    return list
  }, [startDay, daysCount, view.y, view.m, todayJ.y, todayJ.m, todayJ.d, selectedParts])

  const move = (delta: number) => {
    setView(v => {
      const total = v.y * 12 + (v.m - 1) + delta
      return { y: Math.floor(total / 12), m: (total % 12) + 1 }
    })
  }

  const changeYear = (newYear: number) => setView(v => ({ ...v, y: newYear }))
  const changeMonth = (newMonth: number) => setView(v => ({ ...v, m: newMonth }))

  const years = useMemo(() => {
    const list: number[] = []
    const minYear = Math.min(1330, view.y - 8)
    const maxYear = Math.max(1430, view.y + 8)
    for (let y = minYear; y <= maxYear; y++) list.push(y)
    return list
  }, [view.y])

  return (
    <div
      className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[17rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30"
      dir="rtl"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="xs" className="shrink-0" onClick={() => move(1)} title="ماه بعد" aria-label="رفتن به ماه بعد">ماه بعد</Button>
        <div className="flex items-center gap-1">
          <select
            value={view.m}
            onChange={e => changeMonth(Number(e.target.value))}
            className={cn('cursor-pointer rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200', focusRing)}
          >
            {jalaliMonthNames.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>
          <select
            value={view.y}
            onChange={e => changeYear(Number(e.target.value))}
            className="cursor-pointer rounded-[6px] border border-[#e3e8f0] bg-white px-[4px] py-[3px] text-[10px] font-bold text-soft outline-none dark:border-dkline2 dark:bg-dksurf dark:text-[#dbe2f2]"
          >
            {years.map(y => (
              <option key={y} value={y}>{y.toLocaleString('fa-IR', { useGrouping: false })}</option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" size="xs" className="shrink-0" onClick={() => move(-1)} title="ماه قبل" aria-label="رفتن به ماه قبل">ماه قبل</Button>
      </div>
      <div className="grid grid-cols-7 gap-[3px] text-center">
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(w => <span className="py-[3px] text-[8px] font-bold text-faint" key={w}>{w}</span>)}
        {cells.map((cell, i) => cell
          ? (
            <Button
              type="button"
              className={`relative flex h-9 w-full items-center justify-center rounded-lg text-[11px] font-semibold ${transition} ${
                cell.isSelected
                  ? 'bg-indigo-600 font-extrabold text-white shadow-sm shadow-indigo-600/30'
                  : cell.isToday
                    ? 'border border-indigo-300 bg-indigo-50 font-extrabold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'
                    : 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
              key={i}
              aria-pressed={cell.isSelected}
              aria-label={`${cell.d.toLocaleString('fa-IR')} ${jalaliMonthNames[view.m - 1]} ${view.y.toLocaleString('fa-IR', { useGrouping: false })}`}
              onClick={() => onPick?.(view.y, view.m, cell.d)}
            >
              {cell.d.toLocaleString('fa-IR')}
              {activityDays.has(`${view.y}-${view.m}-${cell.d}`) && (
                <i className={`absolute bottom-0.5 right-1/2 h-1 w-1 translate-x-1/2 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
              )}
            </Button>
          )
          : <span key={i} />)}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="soft"
          size="xs"
          className="flex-1 text-[10px]"
          onClick={() => {
            setView({ y: todayJ.y, m: todayJ.m })
            onPick?.(todayJ.y, todayJ.m, todayJ.d)
          }}
        >
          امروز · {todayJ.d.toLocaleString('fa-IR')} {jalaliMonthNames[todayJ.m - 1]}
        </Button>
      </div>
    </div>
  )
}

export function BirthDateField({
  value,
  onChange,
  placeholder = '۱۴۰۵/۰۶/۱۸',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pad = (n: number) => String(n).padStart(2, '0')

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const parsed = useMemo(() => {
    const clean = normalizeDigits(value.trim())
    const m = clean.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
    if (m) {
      const y = Number(m[1])
      const mo = Number(m[2])
      if (y >= 1300 && y <= 1450 && mo >= 1 && mo <= 12) return { y, m: mo }
    }
    return null
  }, [value])

  return (
    <div className="relative mt-1.5" ref={containerRef}>
      <div
        className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-300 bg-white p-1 shadow-sm transition-all duration-200 hover:border-indigo-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-700"
        onClick={() => setOpen(true)}
      >
        <input
          type="text"
          dir="ltr"
          className="m-0 flex-1 border-0 bg-transparent px-2 py-1.5 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
          value={value}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={e => onChange(normalizeDigits(e.target.value))}
        />
        <div className="flex items-center gap-[3px]">
          {value && (
            <Button
              type="button"
              variant="dangerGhost"
              size="xs"
              className="rounded-md px-2 text-xs"
              onClick={e => {
                e.stopPropagation()
                onChange('')
              }}
              title="پاک کردن تاریخ"
              aria-label="پاک کردن تاریخ"
            >
              پاک کردن
            </Button>
          )}
          <Button
            type="button"
            variant="soft"
            size="xs"
            className="rounded-lg px-2 text-xs"
            aria-expanded={open}
            onClick={e => {
              e.stopPropagation()
              setOpen(o => !o)
            }}
            title="انتخاب از تقویم شمسی"
            aria-label="انتخاب از تقویم شمسی"
          >
            تقویم
          </Button>
        </div>
      </div>
      {open && (
        <MiniCalendar
          selectedDate={value}
          initialView={parsed ?? undefined}
          activityDays={new Set()}
          onPick={(y, m, d) => {
            onChange(`${y}/${pad(m)}/${pad(d)}`)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}
