import { useMemo, useState } from 'react'
import { nowTs } from '../../shared'
import { Heading, Icon } from '../../shared-ui'
import { workflow, computeUserStats, computeBottlenecks, rangeDefs } from '../../app-lib'
import type { Person, Activity, Audit } from '../../types'

export function Reports({ people, activities, audit, todayCount, onExport, onPrint }: { people: Person[]; activities: Activity[]; audit: Audit[]; todayCount: number; onExport: () => void; onPrint: () => void }) {
  const counts = workflow.map(s => ({ status: s, count: people.filter(p => p.status === s).length }))
  const maxCount = Math.max(...counts.map(c => c.count), 1)
  const [range, setRange] = useState('month')
  const rangeAct = useMemo(() => { const d = (rangeDefs.find(r => r[0] === range) ?? rangeDefs[2])[1]; const start = nowTs() - d * 86400000; return activities.filter(a => (a.ts ?? 0) >= start) }, [activities, range])
  const prevAct = useMemo(() => { const d = (rangeDefs.find(r => r[0] === range) ?? rangeDefs[2])[1]; const end = nowTs() - d * 86400000; return activities.filter(a => (a.ts ?? 0) >= end - d * 86400000 && (a.ts ?? 0) < end) }, [activities, range])
  const stats = computeUserStats(rangeAct)
  const bn = computeBottlenecks(rangeAct)
  const delta = prevAct.length === 0 ? (rangeAct.length ? 100 : 0) : Math.round(((rangeAct.length - prevAct.length) / prevAct.length) * 100)
  return (
    <>
      <Heading title="گزارش‌ها و Audit Log" subtitle="گزارش‌های مدیریتی و عملیات حساس ثبت‌شده در سامانه." action={<div className="btn-group"><button className="outline" onClick={onExport}><Icon name="download" /> خروجی اکسل</button><button className="primary" onClick={onPrint}><Icon name="printer" /> چاپ گزارش ماهانه</button></div>} />
      <div className="range-bar">
        <span>بازه گزارش:</span>
        {rangeDefs.map(([v, , labelStr]) => <button type="button" key={v} className={`mini-btn ${range === v ? 'on' : ''}`} onClick={() => setRange(v)}>{labelStr}</button>)}
        <em className="range-cmp">{rangeAct.length.toLocaleString('fa-IR')} رویداد در این بازه · {prevAct.length.toLocaleString('fa-IR')} در بازه قبل {delta !== 0 && <b className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? '↑' : '↓'} {Math.abs(delta).toLocaleString('fa-IR')}٪</b>}</em>
      </div>
      <div className="stats">
        <div className="stat"><span>کل Activityها<b>{activities.length.toLocaleString('fa-IR')}</b><small>رویداد پرونده</small></span></div>
        <div className="stat"><span>Audit Log<b>{audit.length.toLocaleString('fa-IR')}</b><small>عملیات حساس</small></span></div>
        <div className="stat"><span>پرونده‌های رد شده<b>{people.filter(p => p.status === 'رد شده').length.toLocaleString('fa-IR')}</b><small>نیازمند اصلاح</small></span></div>
        <div className="stat"><span>ثبت امروز<b>{todayCount.toLocaleString('fa-IR')}</b><small>عملیات ثبت‌شده</small></span></div>
      </div>
      <div className="grid2">
        <section className="panel">
          <h2>Audit Log <small>رویدادهای حساس و غیرقابل حذف</small></h2>
          {audit.map(a => (
            <div className="audit-row" key={a.id}>
              <span><b>{a.action}</b><small>هدف: {a.target}</small></span>
              <time>{a.createdAt}<br />{a.createdBy}</time>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>خلاصه‌ی وضعیت‌ها <small>بر اساس داده‌های واقعی سامانه</small></h2>
          <div className="report-bars">
            {counts.map(({ status, count }) => (
              <div key={status}>
                <span>{status}<b>{count.toLocaleString('fa-IR')}</b></span>
                <i><em style={{ width: `${(count / maxCount) * 100}%` }} /></i>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="grid2">
        <section className="panel">
          <h2>عملکرد کاربران <small>بر اساس بازه انتخاب‌شده</small></h2>
          {stats.length === 0 && <div className="empty">داده‌ای در این بازه موجود نیست</div>}
          {stats.map(([name, s], rank) => (
            <div className="flex items-center gap-[10px] border-t border-[#f0f2f6] py-[10px] first:border-t-0 dark:border-[#222b44]" key={name}>
              <b className="grid h-[24px] w-[24px] flex-[0_0_24px] place-items-center rounded-[7px] bg-[#e8edff] text-[10px] font-bold text-[#5c6ee4] dark:bg-[#1c2650] dark:text-[#9fb0ff]">{(rank + 1).toLocaleString('fa-IR')}</b>
              <span className="w-[115px] truncate text-[11px] font-semibold text-soft dark:text-[#dbe2f2]">{name}</span>
              <span className="flex-1 text-[9px] text-mut">ثبت: {s.creates.toLocaleString('fa-IR')} · تغییر: {s.changes.toLocaleString('fa-IR')} · یادداشت: {s.notes.toLocaleString('fa-IR')}</span>
              <b className="text-[13px] font-extrabold text-pri">{s.total.toLocaleString('fa-IR')}</b>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>گلوگاه‌های گردش‌کار <small>میانگین زمان توقف پرونده در هر مرحله</small></h2>
          <div className="report-bars">
            {bn.filter(b => b.count > 0).length === 0 && <div className="empty">پس از چند تغییر وضعیت در این بازه، این گزارش پر می‌شود</div>}
            {bn.filter(b => b.count > 0).map(b => (
              <div key={b.status}>
                <span>{b.status}<b>{b.label} <small>({b.count.toLocaleString('fa-IR')} پرونده)</small></b></span>
                <i><em style={{ width: `${Math.min(100, (b.count / Math.max(...bn.map(x => x.count), 1)) * 100)}%` }} /></i>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
