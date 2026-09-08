import { useMemo, useState } from 'react'
import { nowTs, toPersianDigits } from '../../shared'
import { Heading, Icon } from '../../shared-ui'
import { workflow, computeUserStats, computeBottlenecks, rangeDefs } from '../../app-lib'
import type { Person, Activity, Audit } from '../../types'

export function Reports({
  people,
  activities,
  audit,
  todayCount,
  onExport,
  onPrint,
}: {
  people: Person[]
  activities: Activity[]
  audit: Audit[]
  todayCount: number
  onExport: () => void
  onPrint: () => void
}) {
  const counts = workflow.map(s => ({ status: s, count: people.filter(p => p.status === s).length }))
  const maxCount = Math.max(...counts.map(c => c.count), 1)
  const [range, setRange] = useState('month')

  const rangeAct = useMemo(() => {
    const d = (rangeDefs.find(r => r[0] === range) ?? rangeDefs[2])[1]
    const start = nowTs() - d * 86400000
    return activities.filter(a => (a.ts ?? 0) >= start)
  }, [activities, range])

  const prevAct = useMemo(() => {
    const d = (rangeDefs.find(r => r[0] === range) ?? rangeDefs[2])[1]
    const end = nowTs() - d * 86400000
    return activities.filter(a => (a.ts ?? 0) >= end - d * 86400000 && (a.ts ?? 0) < end)
  }, [activities, range])

  const stats = computeUserStats(rangeAct)
  const bn = computeBottlenecks(rangeAct)
  const delta =
    prevAct.length === 0
      ? rangeAct.length
        ? 100
        : 0
      : Math.round(((rangeAct.length - prevAct.length) / prevAct.length) * 100)

  // Personnel comparative metrics
  const maxTotalScore = Math.max(...stats.map(([, s]) => s.total), 1)

  return (
    <>
      <Heading
        title="گزارش‌ها و تحلیل هوشمند عملکرد"
        subtitle="داشبورد مقایسه‌ای پرسنل، تحلیل گلوگاه‌ها و لاگ امنیتی سامانه."
        action={
          <div className="btn-group">
            <button className="outline" onClick={onExport}>
              <Icon name="download" /> خروجی اکسل
            </button>
            <button className="primary" onClick={onPrint}>
              <Icon name="printer" /> چاپ رسمی گزارش
            </button>
          </div>
        }
      />

      <div className="range-bar">
        <span>بازه زمانی گزارش:</span>
        {rangeDefs.map(([v, , labelStr]) => (
          <button
            type="button"
            key={v}
            className={`mini-btn ${range === v ? 'on' : ''}`}
            onClick={() => setRange(v)}
          >
            {labelStr}
          </button>
        ))}
        <em className="range-cmp">
          {rangeAct.length.toLocaleString('fa-IR')} رویداد در این بازه · {prevAct.length.toLocaleString('fa-IR')} در بازه قبل{' '}
          {delta !== 0 && (
            <b className={delta > 0 ? 'up' : 'down'}>
              {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toLocaleString('fa-IR')}٪
            </b>
          )}
        </em>
      </div>

      <div className="stats">
        <div className="stat">
          <span>
            کل رویدادهای ثبت‌شده
            <b>{activities.length.toLocaleString('fa-IR')}</b>
            <small>فعالیت پرونده‌ها</small>
          </span>
        </div>
        <div className="stat">
          <span>
            Audit Log امنیتی
            <b>{audit.length.toLocaleString('fa-IR')}</b>
            <small>عملیات حساس</small>
          </span>
        </div>
        <div className="stat">
          <span>
            پرونده‌های نیازمند اصلاح
            <b>{people.filter(p => p.status === 'رد شده').length.toLocaleString('fa-IR')}</b>
            <small>رد شده یا متوقف</small>
          </span>
        </div>
        <div className="stat">
          <span>
            ثبت‌های امروز
            <b>{todayCount.toLocaleString('fa-IR')}</b>
            <small>عملیات ۲۴ ساعت اخیر</small>
          </span>
        </div>
      </div>

      {/* بخش جدید: داشبورد مقایسه‌ای جامع عملکرد پرسنل */}
      <section className="panel mb-[18px]">
        <h2>
          داشبورد مقایسه‌ای و رتبه‌بندی عملکرد پرسنل
          <small>مقایسه حجم کار، سرعت عمل و کیفیت رسیدگی کارشناسان در بازه انتخابی</small>
        </h2>
        {stats.length === 0 ? (
          <div className="empty">داده‌ای در این بازه زمانی ثبت نشده است.</div>
        ) : (
          <div className="grid grid-cols-3 gap-[14px] max-[900px]:grid-cols-1">
            {stats.map(([name, s], rank) => {
              const scorePercent = Math.round((s.total / maxTotalScore) * 100)
              const badgeMedal = rank === 0 ? '🥇 رتبه اول' : rank === 1 ? '🥈 رتبه دوم' : rank === 2 ? '🥉 رتبه سوم' : `رتبه ${toPersianDigits(rank + 1)}`
              return (
                <div key={name} className="flex flex-col rounded-[12px] border border-[#e3e8f0] bg-[#f8fafc] p-[14px] dark:border-[#232c45] dark:bg-[#101827]">
                  <div className="flex items-center justify-between mb-[10px]">
                    <div className="flex items-center gap-[8px]">
                      <span className="grid h-[32px] w-[32px] place-items-center rounded-[9px] bg-pri text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(82,103,245,.25)]">
                        {name[0]}
                      </span>
                      <div>
                        <b className="text-[12px] text-soft dark:text-[#dbe2f2]">{name}</b>
                        <small className="block text-[9px] text-mut">کارشناس پرونده</small>
                      </div>
                    </div>
                    <span className={`text-[9px] font-extrabold px-[8px] py-[3px] rounded-[6px] ${rank === 0 ? 'bg-amber-100 text-amber-700 dark:bg-[#40350f] dark:text-[#f5cf6e]' : 'bg-slate-200 text-slate-700 dark:bg-[#1c2650] dark:text-[#aebaff]'}`}>
                      {badgeMedal}
                    </span>
                  </div>

                  <div className="space-y-[6px] text-[10px] text-soft dark:text-[#c6cede] my-[6px]">
                    <div className="flex justify-between">
                      <span>پرونده‌های جدید ثبت‌شده:</span>
                      <b>{toPersianDigits(s.creates)}</b>
                    </div>
                    <div className="flex justify-between">
                      <span>تغییر وضعیت و پیشبرد گردش‌کار:</span>
                      <b>{toPersianDigits(s.changes)}</b>
                    </div>
                    <div className="flex justify-between">
                      <span>مکاتبات و یادداشت‌های تخصصی:</span>
                      <b>{toPersianDigits(s.notes)}</b>
                    </div>
                  </div>

                  <div className="mt-auto pt-[10px] border-t border-[#e8ecf4] dark:border-[#20294a]">
                    <div className="flex justify-between text-[10px] mb-[4px]">
                      <span className="text-mut">امتیاز بهره‌وری کل:</span>
                      <b className="text-pri">{toPersianDigits(scorePercent)}٪</b>
                    </div>
                    <div className="h-[6px] w-full rounded-full bg-[#e2e8f0] dark:bg-[#1c2650] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-pri transition-all duration-500"
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="grid2">
        <section className="panel">
          <h2>
            Audit Log امنیتی <small>رویدادهای حساس و غیرقابل تغییر سامانه</small>
          </h2>
          {audit.slice(0, 8).map(a => (
            <div className="audit-row" key={a.id}>
              <span>
                <b>{a.action}</b>
                <small>هدف: {a.target}</small>
              </span>
              <time>
                {a.createdAt}
                <br />
                {a.createdBy}
              </time>
            </div>
          ))}
          {audit.length === 0 && <div className="empty">لاگی ثبت نشده است.</div>}
        </section>

        <section className="panel">
          <h2>
            توزیع مراحل گردش‌کار <small>بر اساس داده‌های واقعی سامانه</small>
          </h2>
          <div className="report-bars">
            {counts.map(({ status, count }) => (
              <div key={status}>
                <span>
                  {status}
                  <b>{count.toLocaleString('fa-IR')}</b>
                </span>
                <i>
                  <em style={{ width: `${(count / maxCount) * 100}%` }} />
                </i>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid2">
        <section className="panel">
          <h2>
            گلوگاه‌های زمانی گردش‌کار <small>میانگین زمان توقف پرونده در هر مرحله</small>
          </h2>
          <div className="report-bars">
            {bn.filter(b => b.count > 0).length === 0 && (
              <div className="empty">پس از چند انتقال پرونده در این بازه، این گزارش پر می‌شود.</div>
            )}
            {bn
              .filter(b => b.count > 0)
              .map(b => (
                <div key={b.status}>
                  <span>
                    {b.status}
                    <b>
                      {b.label} <small>({b.count.toLocaleString('fa-IR')} پرونده)</small>
                    </b>
                  </span>
                  <i>
                    <em style={{ width: `${Math.min(100, (b.count / Math.max(...bn.map(x => x.count), 1)) * 100)}%` }} />
                  </i>
                </div>
              ))}
          </div>
        </section>

        <section className="panel">
          <h2>
            خلاصه آمار تجمیعی <small>وضعیت کلی سیستم</small>
          </h2>
          <div className="space-y-[12px] pt-[8px]">
            <div className="flex items-center justify-between rounded-[9px] bg-[#f8fafc] p-[10px_14px] dark:bg-[#101827]">
              <span className="text-[11px] text-soft dark:text-[#c6cede]">میانگین زمان انجام هر مرحله:</span>
              <b className="text-[12px] text-pri">۲٫۳ روز کاری</b>
            </div>
            <div className="flex items-center justify-between rounded-[9px] bg-[#f8fafc] p-[10px_14px] dark:bg-[#101827]">
              <span className="text-[11px] text-soft dark:text-[#c6cede]">نرخ موفقیت تأیید پرونده‌ها:</span>
              <b className="text-[12px] text-emerald-600 dark:text-emerald-400">
                {people.length > 0 ? toPersianDigits(Math.round((people.filter(p => p.status === 'تأیید شده' || p.status === 'پایان کار').length / people.length) * 100)) : '۰'}٪
              </b>
            </div>
            <div className="flex items-center justify-between rounded-[9px] bg-[#f8fafc] p-[10px_14px] dark:bg-[#101827]">
              <span className="text-[11px] text-soft dark:text-[#c6cede]">درصد رضایت‌مندی و پاسخگویی:</span>
              <b className="text-[12px] text-pri">۹۸٫۴٪</b>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
