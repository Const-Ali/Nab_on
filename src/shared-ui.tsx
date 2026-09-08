import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { jalaliJdn, jalaliMonthNames, jalaliParts, jdnToDate, normalizeDigits } from './shared'
import { avatarBase, avatarTones } from './components/ui'

export function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87',
    workflow: 'M4 4h6v6H4zM14 14h6v6h-6zM10 7h4a2 2 0 0 1 2 2v5',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 15l2 2-2 2-2-2',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9',
    plus: 'M12 5v14M5 12h14',
    close: 'M6 6l12 12M18 6 6 18',
    check: 'm5 12 4 4L19 6',
    download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 21h16',
    edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
    camera: 'M4 7h3l2-2h6l2 2h3v12H4zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
    cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    task: 'M9 6h12M9 12h12M9 18h12M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2',
  }
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={paths[name] ?? paths.grid} />
    </svg>
  )
}

export function Avatar({ text, tone = 'blue', src, size }: { text: string; tone?: string; src?: string; size?: number }) {
  const style = size ? { width: size, height: size, flex: `0 0 ${size}px` } : undefined
  return src
    ? <span className={`${avatarBase} p-0 overflow-hidden`} style={style}><img className="block h-full w-full object-cover" src={src} alt="" /></span>
    : <span className={`${avatarBase} ${avatarTones[tone] ?? avatarTones.blue}`} style={style}>{text}</span>
}

export function Heading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="mb-[25px] flex items-end justify-between max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-[13px]">
      <div>
        <small className="text-[10px] text-[#9aa4b6]">سامانه ناب</small>
        <h1 className="m-[6px_0_3px] text-[27px] text-[#1d2942] dark:text-[#eef2fb] max-[700px]:text-[23px]">{title}</h1>
        <p className="m-0 text-[11px] text-[#9aa4b5]">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

const calNavBtn = 'h-[26px] w-[26px] flex-[0_0_26px] rounded-[7px] border border-[#e3e8f0] bg-white text-[13px] leading-none text-[#69758b] hover:border-[#c3cdf7] hover:text-pri dark:border-dkline2 dark:bg-dksurf dark:text-[#c6cede]'

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
      className="mini-cal rounded-[14px] border border-line bg-white p-[14px] shadow-[0_18px_45px_rgba(39,50,83,.22)] dark:border-[#232c45] dark:bg-[#151d30]"
      dir="rtl"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="mb-[10px] flex items-center justify-between gap-[6px]">
        <button type="button" className={calNavBtn} onClick={() => move(1)} title="ماه بعد" aria-label="ماه بعد">‹</button>
        <div className="flex items-center gap-[4px]">
          <select
            value={view.m}
            onChange={e => changeMonth(Number(e.target.value))}
            className="cursor-pointer rounded-[6px] border border-[#e3e8f0] bg-white px-[4px] py-[3px] text-[10px] font-bold text-soft outline-none dark:border-dkline2 dark:bg-dksurf dark:text-[#dbe2f2]"
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
        <button type="button" className={calNavBtn} onClick={() => move(-1)} title="ماه قبل" aria-label="ماه قبل">›</button>
      </div>
      <div className="grid grid-cols-7 gap-[3px] text-center">
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(w => <span className="py-[3px] text-[8px] font-bold text-faint" key={w}>{w}</span>)}
        {cells.map((cell, i) => cell
          ? (
            <button
              type="button"
              className={`relative flex h-[28px] w-full items-center justify-center rounded-[7px] text-[10px] font-semibold transition-colors ${
                cell.isSelected
                  ? 'bg-pri font-extrabold text-white shadow-[0_2px_8px_rgba(82,103,245,.35)]'
                  : cell.isToday
                    ? 'border border-pri bg-[#eef2ff] font-extrabold text-pri dark:bg-[#1a2444] dark:text-[#9fb0ff]'
                    : 'border-0 bg-transparent text-[#3d4658] hover:bg-[#edf1ff] dark:text-[#dbe2f2] dark:hover:bg-[#1c2650]'
              }`}
              key={i}
              onClick={() => onPick?.(view.y, view.m, cell.d)}
            >
              {cell.d.toLocaleString('fa-IR')}
              {activityDays.has(`${view.y}-${view.m}-${cell.d}`) && (
                <i className={`absolute bottom-[2px] right-1/2 h-[4px] w-[4px] translate-x-1/2 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-pri'}`} />
              )}
            </button>
          )
          : <span key={i} />)}
      </div>
      <div className="mt-[10px] flex items-center justify-between gap-[6px]">
        <button
          type="button"
          className="flex-1 rounded-[7px] bg-[#eef1ff] py-[5px] text-[9px] font-bold text-pri transition-colors hover:bg-[#e0e7ff] dark:bg-[#1c2650] dark:text-[#9fb0ff]"
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
    <div className="datefield relative mt-[6px]" ref={containerRef}>
      <div
        className="flex cursor-pointer items-center justify-between rounded-[9px] border border-[#d0d7e5] bg-[#fcfdfe] p-[3px_5px] shadow-[0_1px_2px_rgba(0,0,0,.03)] transition-all hover:border-[#9fb0ff] focus-within:border-pri focus-within:shadow-[0_0_0_2px_rgba(82,103,245,.14)] dark:border-[#2a3552] dark:bg-[#0f1628] dark:hover:border-[#3e4d82]"
        onClick={() => setOpen(true)}
      >
        <input
          type="text"
          dir="ltr"
          className="flex-1 !m-0 !border-0 bg-transparent !p-[7px_8px] text-[10px] font-medium text-soft outline-0 dark:text-[#dfe5f2]"
          value={value}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={e => onChange(normalizeDigits(e.target.value))}
        />
        <div className="flex items-center gap-[3px]">
          {value && (
            <button
              type="button"
              className="flex h-[24px] w-[24px] items-center justify-center rounded-[5px] !border-0 !bg-transparent text-[11px] text-mut hover:bg-[#f0f2f7] hover:text-red-500 dark:hover:bg-[#1b233a]"
              onClick={e => {
                e.stopPropagation()
                onChange('')
              }}
              title="پاک کردن تاریخ"
              aria-label="پاک کردن تاریخ"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            className="flex h-[28px] w-[28px] items-center justify-center rounded-[7px] !border-0 bg-[#eef2ff] text-pri transition-all hover:bg-pri hover:text-white dark:bg-[#1c2650] dark:text-[#9fb0ff] dark:hover:bg-pri dark:hover:text-white"
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
