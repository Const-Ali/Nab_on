import { Button } from '../common/Button'
import { useMemo, useState } from 'react'
import { formatServerTimestamp, nowTs, toPersianDigits } from '../../shared'
import { Heading } from '../../shared-ui'
import { computeBottlenecks, computeUserStats, rangeDefs } from '../../app-lib'
import type { Activity, Audit, Person } from '../../types'
import type { WorkflowConfig } from '../../workflow'
import { activeStages, stageIdForPerson } from '../../workflow'
import { cn, emptyBox, panelBox, panelH2, panelH2Small, panelPad } from '../ui'

const bar = (value: number) => {
  if (value >= 95) return 'w-full'
  if (value >= 80) return 'w-10/12'
  if (value >= 65) return 'w-8/12'
  if (value >= 50) return 'w-6/12'
  if (value >= 35) return 'w-4/12'
  if (value >= 15) return 'w-2/12'
  return value ? 'w-1/12' : 'w-0'
}

const Metric = ({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) => (
  <article className={cn(panelBox, panelPad)}>
    <span className={cn('inline-flex rounded-lg px-2 py-1 text-xs font-semibold', tone)}>{label}</span>
    <b className="mt-4 block text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</b>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>
  </article>
)

export function Reports({
  people,
  activities,
  audit,
  workflowConfig,
  todayCount,
  canViewPeople,
  canViewActivities,
  canViewAudit,
  canExportPeople,
  canPrintReports,
  onExport,
  onPrint,
}: {
  people: Person[]
  activities: Activity[]
  audit: Audit[]
  workflowConfig: WorkflowConfig
  todayCount: number
  canViewPeople: boolean
  canViewActivities: boolean
  canViewAudit: boolean
  canExportPeople: boolean
  canPrintReports: boolean
  onExport: () => void
  onPrint: () => void
}) {
  const [range, setRange] = useState('month')
  const days = (rangeDefs.find(item => item[0] === range) ?? rangeDefs[2])[1]
  const current = useMemo(() => activities.filter(item => (item.ts ?? 0) >= nowTs() - days * 86400000), [activities, days])
  const previous = useMemo(() => {
    const end = nowTs() - days * 86400000
    return activities.filter(item => (item.ts ?? 0) >= end - days * 86400000 && (item.ts ?? 0) < end)
  }, [activities, days])
  const users = computeUserStats(current)
  const bottlenecks = computeBottlenecks(current, workflowConfig)
  const workflowStages = activeStages(workflowConfig)
  const statuses = workflowStages.map(stage => ({ stage, count: people.filter(person => stageIdForPerson(person, workflowConfig) === stage.id).length }))
  const maxStatus = Math.max(...statuses.map(item => item.count), 1)
  const maxUser = Math.max(...users.map(([, item]) => item.total), 1)
  const maxBottleneck = Math.max(...bottlenecks.map(item => item.count), 1)
  const change = previous.length ? Math.round(((current.length - previous.length) / previous.length) * 100) : current.length ? 100 : 0
  const countByMetric = (metric: string) => people.filter(person => workflowConfig.stages.find(stage => stage.id === stageIdForPerson(person, workflowConfig))?.metric === metric).length
  const rejectedCount = countByMetric('rejected')
  const approved = people.filter(person => {
    const stageId = stageIdForPerson(person, workflowConfig)
    const stage = workflowConfig.stages.find(item => item.id === stageId)
    return stageId === 'approved' || stage?.metric === 'completed'
  }).length
  const approvedRate = people.length ? Math.round((approved / people.length) * 100) : 0

  const metrics = [
    ...(canViewActivities ? [{ label: 'کل رویدادها', value: activities.length.toLocaleString('fa-IR'), note: 'همهٔ فعالیت‌های ثبت‌شده', tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' }] : []),
    ...(canViewAudit ? [{ label: 'رویداد امنیتی', value: audit.length.toLocaleString('fa-IR'), note: 'رکوردهای Audit Log', tone: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' }] : []),
    ...(canViewPeople ? [{ label: 'نیازمند پیگیری', value: rejectedCount.toLocaleString('fa-IR'), note: 'پرونده‌های ردشده در گردش‌کار', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' }] : []),
    ...(canViewActivities ? [{ label: 'ثبت امروز', value: todayCount.toLocaleString('fa-IR'), note: 'عملیات ۲۴ ساعت اخیر', tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' }] : []),
  ]

  return <>
    <Heading
      title="گزارش‌ها و تحلیل عملکرد"
      subtitle="نمایی از شاخص‌هایی که مجوزهای مشاهدهٔ پرونده، فعالیت و رخداد امنیتی آن‌ها را جداگانه تعیین می‌کند."
      action={canExportPeople || canPrintReports ? <div className="flex flex-col gap-2 sm:flex-row">
        {canExportPeople && <Button variant="outline" onClick={onExport}>خروجی CSV پرونده‌ها</Button>}
        {canPrintReports && <Button variant="primary" onClick={onPrint}>چاپ گزارش</Button>}
      </div> : undefined}
    />

    {!canViewPeople && !canViewActivities && !canViewAudit && (
      <div className={cn(panelBox, panelPad, 'mb-5 text-sm leading-6 text-slate-600 dark:text-slate-300')}>
        صفحهٔ گزارش برای حساب شما فعال است، اما مجوز مشاهدهٔ منبع داده‌ای برای نمایش گزارش صادر نشده است. برای گزارش پرونده، فعالیت یا رخداد امنیتی، مجوز متناظر را نیز به حساب یا نقش اضافه کنید.
      </div>
    )}

    {canViewActivities && <section className={cn(panelBox, panelPad, 'mb-5')}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className={panelH2}>بازه تحلیل فعالیت‌ها</h2><p className={panelH2Small}>داده‌ها با بازهٔ پیشین مقایسه می‌شوند.</p></div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="بازه تحلیل">
          {rangeDefs.map(([value, , label]) => <Button type="button" key={value} variant="tab" size="xs" active={range === value} className={range === value ? 'on' : ''} onClick={() => setRange(value)}>{label}</Button>)}
        </div>
      </div>
      <div className="mt-4 flex flex-col justify-between gap-1 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600 sm:flex-row dark:bg-slate-950/50 dark:text-slate-300">
        <span>{current.length.toLocaleString('fa-IR')} رویداد در بازه انتخاب‌شده</span>
        <span>بازه قبل: {previous.length.toLocaleString('fa-IR')} {change !== 0 && <b className={cn('mr-2', change > 0 ? 'text-emerald-600' : 'text-rose-600')}>{Math.abs(change).toLocaleString('fa-IR')}٪</b>}</span>
      </div>
    </section>}

    {metrics.length > 0 && <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(metric => <Metric key={metric.label} {...metric} />)}
    </div>}

    {canViewActivities && <section className={cn(panelBox, panelPad, 'mb-5')}>
      <h2 className={panelH2}>عملکرد کارشناسان</h2>
      <p className={panelH2Small}>ایجاد پرونده، پیشبرد گردش‌کار و یادداشت‌های ثبت‌شده در بازهٔ انتخابی.</p>
      {users.length === 0 ? <div className={cn(emptyBox, 'mt-5')}>در این بازه داده‌ای برای تحلیل عملکرد ثبت نشده است.</div> : (
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {users.map(([name, item], index) => {
            const score = Math.round((item.total / maxUser) * 100)
            return <article key={name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">{name[0]}</span><div><b className="block text-sm text-slate-900 dark:text-white">{name}</b><small className="text-xs text-slate-500">کارشناس پرونده</small></div></div>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">رتبه {toPersianDigits(index + 1)}</span>
              </div>
              <dl className="my-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white p-2 dark:bg-slate-900"><dt className="text-[11px] text-slate-500">ثبت</dt><dd className="mt-1 font-bold text-slate-900 dark:text-white">{toPersianDigits(item.creates)}</dd></div>
                <div className="rounded-lg bg-white p-2 dark:bg-slate-900"><dt className="text-[11px] text-slate-500">پیگیری</dt><dd className="mt-1 font-bold text-slate-900 dark:text-white">{toPersianDigits(item.changes)}</dd></div>
                <div className="rounded-lg bg-white p-2 dark:bg-slate-900"><dt className="text-[11px] text-slate-500">یادداشت</dt><dd className="mt-1 font-bold text-slate-900 dark:text-white">{toPersianDigits(item.notes)}</dd></div>
              </dl>
              <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={cn('h-full rounded-full bg-indigo-600', bar(score))} /></div><b className="text-xs text-indigo-700 dark:text-indigo-300">{toPersianDigits(score)}٪</b></div>
            </article>
          })}
        </div>
      )}
    </section>}

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {canViewPeople && <section className={cn(panelBox, panelPad)}>
        <h2 className={panelH2}>توزیع مراحل گردش‌کار</h2><p className={panelH2Small}>تعداد پرونده‌ها در هر مرحله.</p>
        <div className="mt-5 space-y-4">{statuses.map(item => <div key={item.stage.id}>
          <div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="truncate text-slate-700 dark:text-slate-200">{item.stage.label}</span><b className="text-slate-950 dark:text-white">{item.count.toLocaleString('fa-IR')}</b></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={cn('h-full rounded-full bg-indigo-600', bar(item.count / maxStatus * 100))} /></div>
        </div>)}</div>
      </section>}
      {canViewActivities && <section className={cn(panelBox, panelPad)}>
        <h2 className={panelH2}>گلوگاه‌های زمانی</h2><p className={panelH2Small}>مراحل دارای بیشترین پرونده در انتظار رسیدگی.</p>
        {bottlenecks.filter(item => item.count > 0).length === 0 ? <div className={cn(emptyBox, 'mt-5')}>هنوز داده کافی برای تشخیص گلوگاه وجود ندارد.</div> : <div className="mt-5 space-y-4">{bottlenecks.filter(item => item.count > 0).map(item => <div key={item.status}>
          <div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="truncate text-slate-700 dark:text-slate-200">{item.status}</span><b className="text-amber-700 dark:text-amber-300">{item.label} · {item.count.toLocaleString('fa-IR')}</b></div>
          <div className="h-2 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950/50"><div className={cn('h-full rounded-full bg-amber-500', bar(item.count / maxBottleneck * 100))} /></div>
        </div>)}</div>}
      </section>}
      {canViewAudit && <section className={cn(panelBox, panelPad)}>
        <h2 className={panelH2}>رویدادهای امنیتی اخیر</h2><p className={panelH2Small}>آخرین عملیات حساس ثبت‌شده در سامانه.</p>
        {audit.length === 0 ? <div className={cn(emptyBox, 'mt-5')}>رویداد امنیتی ثبت نشده است.</div> : <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">{audit.slice(0, 8).map(item => <div className="flex gap-3 py-3 first:pt-0" key={item.id}>
          <div className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-800 dark:text-slate-100">{item.action}</b><small className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">هدف: {item.target}</small></div>
          <time className="shrink-0 text-left text-[11px] leading-5 text-slate-500 dark:text-slate-400">{formatServerTimestamp(item.createdAt, item.ts)}<br />{item.createdBy}</time>
        </div>)}</div>}
      </section>}
      {(canViewPeople || canViewActivities) && <section className={cn(panelBox, panelPad)}>
        <h2 className={panelH2}>خلاصهٔ مدیریتی</h2><p className={panelH2Small}>شاخص‌های کلیدی بر اساس مجوزهای فعال شما.</p>
        <div className="mt-5 space-y-3">
          {canViewPeople && <>
            <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50"><span className="text-sm text-slate-600 dark:text-slate-300">نرخ تأیید پرونده‌ها</span><b className="text-lg text-emerald-700 dark:text-emerald-300">{toPersianDigits(approvedRate)}٪</b></div>
            <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50"><span className="text-sm text-slate-600 dark:text-slate-300">پرونده‌های فعال</span><b className="text-lg text-indigo-700 dark:text-indigo-300">{people.length.toLocaleString('fa-IR')}</b></div>
          </>}
          {canViewActivities && <div className="flex justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50"><span className="text-sm text-slate-600 dark:text-slate-300">رویدادهای بازه انتخاب‌شده</span><b className="text-lg text-violet-700 dark:text-violet-300">{current.length.toLocaleString('fa-IR')}</b></div>}
        </div>
      </section>}
    </div>
  </>
}
