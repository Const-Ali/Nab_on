import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Activity, AlarmClock, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bell, CalendarDays, Camera, ChartNoAxesCombined, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Columns3, Download, FileSpreadsheet, Filter, FolderOpen, History, LayoutDashboard, List, ListTodo, LogIn, LogOut, MessageSquare, Minimize2, Moon, Palette, Pause, Pencil, Play, Plus, Printer, Reply, RotateCcw, Save, Search, Send, Settings2, ShieldCheck, Sun, Timer, Trash2, TriangleAlert, UserRoundPlus, UsersRound, Workflow, X, Zap, type LucideIcon } from 'lucide-react'
import { jalaliJdn, jalaliMonthNames, jalaliParts, jdnToDate, normalizeDigits } from './shared'
import { avatarBase, avatarSize, avatarTones, cn, focusRing, transition } from './components/ui'

export function Icon({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, LucideIcon> = { grid: LayoutDashboard, users: UsersRound, workflow: Workflow, activity: Activity, shield: ShieldCheck, settings: Settings2, search: Search, bell: Bell, plus: Plus, close: X, check: Check, download: Download, edit: Pencil, sun: Sun, moon: Moon, palette: Palette, camera: Camera, logout: LogOut, printer: Printer, trash: Trash2, cal: CalendarDays, task: ListTodo, back: ArrowRight, forward: ArrowLeft, next: ChevronLeft, previous: ChevronRight, save: Save, history: History, filter: Filter, list: List, kanban: Columns3, chart: ChartNoAxesCombined, file: FileSpreadsheet, folder: FolderOpen, message: MessageSquare, reply: Reply, send: Send, timer: Timer, alarm: AlarmClock, clock: Clock3, reset: RotateCcw, minimize: Minimize2, play: Play, pause: Pause, login: LogIn, userPlus: UserRoundPlus, checked: CheckCircle2, warning: TriangleAlert, quick: Zap, up: ArrowUp, down: ArrowDown }
  const Component = icons[name] ?? LayoutDashboard
  return <Component aria-hidden="true" className={cn('h-4 w-4 shrink-0', className)} strokeWidth={1.8} />
}

export function Avatar({ text, tone = 'blue', src, size }: { text: string; tone?: string; src?: string; size?: number }) {
  const sizing = size ? (avatarSize[size] ?? avatarBase) : avatarBase
  return src
    ? <span className={cn(avatarBase, sizing, 'p-0')}><img className="block h-full w-full object-cover" src={src} alt="" /></span>
    : <span className={cn(avatarBase, sizing, avatarTones[tone] ?? avatarTones.blue)}>{text}</span>
}

export function Heading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <small className="text-xs font-medium text-slate-500 dark:text-slate-400">سامانه ناب</small>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

const calNavBtn = cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm leading-none text-slate-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950 dark:hover:text-indigo-200', focusRing, transition)

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
        <button type="button" className={calNavBtn} onClick={() => move(1)} title="ماه بعد" aria-label="ماه بعد"><Icon name="next" /></button>
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
        <button type="button" className={calNavBtn} onClick={() => move(-1)} title="ماه قبل" aria-label="ماه قبل"><Icon name="previous" /></button>
      </div>
      <div className="grid grid-cols-7 gap-[3px] text-center">
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(w => <span className="py-[3px] text-[8px] font-bold text-faint" key={w}>{w}</span>)}
        {cells.map((cell, i) => cell
          ? (
            <button
              type="button"
              className={`relative flex h-8 w-full items-center justify-center rounded-lg text-[11px] font-semibold ${transition} ${
                cell.isSelected
                  ? 'bg-indigo-600 font-extrabold text-white shadow-sm shadow-indigo-600/30'
                  : cell.isToday
                    ? 'border border-indigo-300 bg-indigo-50 font-extrabold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'
                    : 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
              key={i}
              onClick={() => onPick?.(view.y, view.m, cell.d)}
            >
              {cell.d.toLocaleString('fa-IR')}
              {activityDays.has(`${view.y}-${view.m}-${cell.d}`) && (
                <i className={`absolute bottom-0.5 right-1/2 h-1 w-1 translate-x-1/2 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
              )}
            </button>
          )
          : <span key={i} />)}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className={cn('flex-1 rounded-lg bg-indigo-50 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900', transition, focusRing)}
          onClick={() => {
            setView({ y: todayJ.y, m: todayJ.m })
            onPick?.(todayJ.y, todayJ.m, todayJ.d)
          }}
        >
          امروز · {todayJ.d.toLocaleString('fa-IR')} {jalaliMonthNames[todayJ.m - 1]}
        </button>
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
            <button
              type="button"
              className={cn('flex h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent text-sm text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800', focusRing, transition)}
              onClick={e => {
                e.stopPropagation()
                onChange('')
              }}
              title="پاک کردن تاریخ"
              aria-label="پاک کردن تاریخ"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            className={cn('flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-600', focusRing, transition)}
            onClick={e => {
              e.stopPropagation()
              setOpen(o => !o)
            }}
            title="انتخاب از تقویم شمسی"
            aria-label="انتخاب از تقویم شمسی"
          >
            <Icon name="cal" className="h-[14px] w-[14px]" />
          </button>
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
