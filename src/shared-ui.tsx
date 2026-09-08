import { useState } from 'react'
import type { ReactNode } from 'react'
import { jalaliParts } from './shared'
import { avatarBase, avatarTones } from './components/ui'

export function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, string> = { grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87', workflow: 'M4 4h6v6H4zM14 14h6v6h-6zM10 7h4a2 2 0 0 1 2 2v5', activity: 'M3 12h4l3-8 4 16 3-8h4', shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4', settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 15l2 2-2 2-2-2', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4', bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', plus: 'M12 5v14M5 12h14', close: 'M6 6l12 12M18 6 6 18', check: 'm5 12 4 4L19 6', download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 21h16', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z', sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4', moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z', camera: 'M4 7h3l2-2h6l2 2h3v12H4zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7', logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z', cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', task: 'M9 6h12M9 12h12M9 18h12M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2' }
  return <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}><path d={paths[name] ?? paths.grid} /></svg>
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

const calNavBtn = 'h-[26px] w-[26px] rounded-[7px] border border-[#e3e8f0] bg-white text-[13px] leading-none text-[#69758b] hover:border-[#c3cdf7] hover:text-pri dark:border-dkline2 dark:bg-dksurf dark:text-[#c6cede]'

export function MiniCalendar({ activityDays, onPick }: { activityDays: Set<string>; onPick?: (y: number, m: number, d: number) => void }) {
  const todayJ = jalaliParts(new Date())
  const [view, setView] = useState(() => ({ y: todayJ.y, m: todayJ.m }))
  const monthIndex = (j: { y: number; m: number }) => j.y * 12 + j.m
  const monthStart = (() => {
    const g = new Date()
    g.setHours(0, 0, 0, 0)
    let j = jalaliParts(g)
    while (j.d !== 1) { g.setDate(g.getDate() - 1); j = jalaliParts(g) }
    while (monthIndex(jalaliParts(g)) < monthIndex(view)) { g.setDate(g.getDate() + 1); j = jalaliParts(g); while (j.d !== 1) { g.setDate(g.getDate() + 1); j = jalaliParts(g) } }
    while (monthIndex(jalaliParts(g)) > monthIndex(view)) { g.setDate(g.getDate() - 1); j = jalaliParts(g); while (j.d !== 1) { g.setDate(g.getDate() - 1); j = jalaliParts(g) } }
    return g
  })()
  const cells: ({ d: number; today: boolean } | null)[] = []
  for (let i = 0; i < (monthStart.getDay() + 1) % 7; i++) cells.push(null)
  const cursor = new Date(monthStart)
  for (let stop = 0; stop < 40; stop++) {
    const j = jalaliParts(cursor)
    if (j.y !== view.y || j.m !== view.m) break
    cells.push({ d: j.d, today: j.y === todayJ.y && j.m === todayJ.m && j.d === todayJ.d })
    cursor.setDate(cursor.getDate() + 1)
  }
  const monthLabel = new Intl.DateTimeFormat('fa-IR', { month: 'long', year: 'numeric' }).format(monthStart)
  const move = (delta: number) => setView(v => { const total = v.y * 12 + (v.m - 1) + delta; return { y: Math.floor(total / 12), m: (total % 12) + 1 } })
  return (
    <div className="mini-cal rounded-[14px] border border-line bg-white p-[14px] shadow-[0_18px_45px_rgba(39,50,83,.16)] dark:border-[#232c45] dark:bg-[#151d30]" dir="rtl">
      <div className="mb-[10px] flex items-center justify-between">
        <button type="button" className={calNavBtn} onClick={() => move(1)} aria-label="ماه بعد">‹</button>
        <b className="text-[11px] text-soft dark:text-[#dbe2f2]">{monthLabel}</b>
        <button type="button" className={calNavBtn} onClick={() => move(-1)} aria-label="ماه قبل">›</button>
      </div>
      <div className="grid grid-cols-7 gap-[3px] text-center">
        {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(w => <span className="py-[3px] text-[8px] text-faint" key={w}>{w}</span>)}
        {cells.map((cell, i) => cell
          ? <span className={`relative rounded-[7px] py-[6px] text-[10px] ${cell.today ? 'bg-pri font-extrabold text-white' : 'text-[#3d4658] dark:text-[#dbe2f2]'} ${onPick ? 'cursor-pointer' : ''}`} key={i} onClick={() => onPick?.(view.y, view.m, cell.d)}>{cell.d.toLocaleString('fa-IR')}{activityDays.has(`${view.y}-${view.m}-${cell.d}`) && <i className={`absolute bottom-[2px] right-1/2 h-[4px] w-[4px] translate-x-1/2 rounded-full ${cell.today ? 'bg-white' : 'bg-pri'}`} />}</span>
          : <span key={i} />)}
      </div>
      <div className="mt-[10px] text-center">
        <button type="button" className="rounded-[7px] bg-[#eef1ff] px-[12px] py-[5px] text-[9px] text-pri dark:bg-[#1c2650] dark:text-[#9fb0ff]" onClick={() => setView({ y: todayJ.y, m: todayJ.m })}>برو به امروز · {todayJ.d.toLocaleString('fa-IR')} {new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(new Date())}</button>
      </div>
    </div>
  )
}

export function BirthDateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="datefield relative mt-[6px]">
      <button type="button" className="flex w-full items-center justify-between rounded-[8px] border border-[#e1e6ef] bg-white p-[9px] text-[10px] text-[#667288] dark:border-dkline2 dark:bg-dksurf dark:text-[#dfe5f2]" onClick={() => setOpen(o => !o)}>
        <span>{value ? value.replace(/(\d)/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) : 'انتخاب از تقویم شمسی'}</span>
        <Icon name="cal" className="h-[14px] w-[14px]" />
      </button>
      {open && <MiniCalendar activityDays={new Set()} onPick={(y, m, d) => { onChange(`${y}/${pad(m)}/${pad(d)}`); setOpen(false) }} />}
    </div>
  )
}
