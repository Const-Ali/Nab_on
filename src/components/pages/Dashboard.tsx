import { Button } from '../common/Button'
import { Avatar, Heading } from '../../shared-ui'
import { formatServerTimestamp } from '../../shared'
import type { Status, Person, Activity } from '../../types'
import { Badge } from '../common/Badge'
import { cn, emptyBox, panelBox, panelH2 } from '../ui'

type ActivityTrend = { labels: string[]; fullLabels: string[]; values: number[] }

export function Dashboard({
  people,
  activities,
  trend,
  canViewActivities,
  canCreate,
  onCreate,
  onPersons,
  onActivities,
  onSelect,
  greeting,
}: {
  people: Person[]
  activities: Activity[]
  trend: ActivityTrend
  canViewActivities: boolean
  canCreate: boolean
  onCreate: () => void
  onPersons: () => void
  onActivities: () => void
  onSelect: (p: Person) => void
  greeting: string
}) {
  const count = (status: Status) => people.filter(person => person.status === status).length
  const otherCount = Math.max(0, people.length - count('پرونده فعال') - count('بررسی مرکز') - count('رد شده'))
  const trendTotal = trend.values.reduce((sum, value) => sum + value, 0)
  const hasTrend = canViewActivities && trendTotal > 0
  const chart = { left: 48, right: 616, top: 18, bottom: 160, width: 640, height: 194 }
  const maxValue = Math.max(...trend.values, 0)
  const scaleMax = Math.max(4, Math.ceil(maxValue / 4) * 4)
  const tickValues = Array.from(new Set([0, Math.round(scaleMax / 4), Math.round(scaleMax / 2), Math.round((scaleMax * 3) / 4), scaleMax]))
  const points = trend.values.map((value, index) => ({
    x: chart.right - (index / Math.max(1, trend.values.length - 1)) * (chart.right - chart.left),
    y: chart.bottom - (value / scaleMax) * (chart.bottom - chart.top),
  }))
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = points.length ? `${linePath} L ${chart.right} ${chart.bottom} L ${chart.left} ${chart.bottom} Z` : ''

  const kpis = [
    {
      label: 'کل پرونده‌ها',
      value: people.length,
      caption: 'همهٔ مراحل گردش‌کار',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="7" r="3.5"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M16 3.6a3.5 3.5 0 0 1 0 6.8"/></svg>,
    },
    {
      label: 'درخواست‌های جدید',
      value: count('درخواست پرونده'),
      caption: 'در مرحلهٔ درخواست پرونده',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M7 3.75h7l4 4V20a1.25 1.25 0 0 1-1.25 1.25h-9.5A1.25 1.25 0 0 1 6 20V5a1.25 1.25 0 0 1 1.25-1.25Z"/><path d="M14 4v4h4M9 13h6M9 16.5h6"/></svg>,
    },
    {
      label: 'پرونده‌های فعال',
      value: count('پرونده فعال'),
      caption: 'در مرحلهٔ پروندهٔ فعال',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.3 2.3 4.8-5"/></svg>,
    },
    {
      label: 'در انتظار بررسی',
      value: count('بررسی مرکز'),
      caption: 'در مرحلهٔ بررسی مرکز',
      icon: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>,
    },
  ]

  return (
    <>
      <Heading
        title={greeting}
        subtitle="وضعیت پرونده‌ها و فعالیت‌های سامانه را در یک نگاه ببینید."
        action={canCreate ? <Button variant="primary" onClick={onCreate}>ثبت پروندهٔ جدید</Button> : <Button variant="outline" onClick={onPersons}>مشاهدهٔ پرونده‌ها</Button>}
      />

      <div className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {kpis.map(item => (
          <article className="flex min-w-0 items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-[border-color,box-shadow] hover:border-indigo-200 hover:shadow-md sm:gap-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900" key={item.label}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700 sm:h-10 sm:w-10 dark:bg-indigo-950/50 dark:text-indigo-300">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium leading-5 text-slate-500 sm:text-sm dark:text-slate-400">{item.label}</p>
              <b className="mt-1 block text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white">{item.value.toLocaleString('fa-IR')}</b>
              <small className="mt-1 block text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5 dark:text-slate-400">{item.caption}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className={cn(panelBox, 'min-w-0 p-4 sm:p-5 xl:col-span-2')} aria-labelledby="activity-trend-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="activity-trend-title" className={panelH2}>روند رویدادهای پرونده‌ها</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">تعداد رویدادهای ثبت‌شده در شش ماه اخیر</p>
            </div>
            {canViewActivities && <Button type="button" variant="ghost" size="xs" onClick={onActivities}>مشاهدهٔ رویدادها</Button>}
          </div>

          {!canViewActivities ? (
            <div className={cn(emptyBox, 'mt-4 py-10')}>برای مشاهدهٔ روند رویدادها، دسترسی مشاهدهٔ رویدادها لازم است.</div>
          ) : !hasTrend ? (
            <div className={cn(emptyBox, 'mt-4 grid min-h-56 place-items-center py-8')}>
              <div>
                <svg viewBox="0 0 40 40" className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 32h30M8 28l8-8 6 5 10-12"/><circle cx="32" cy="13" r="2"/></svg>
                <p className="font-medium text-slate-700 dark:text-slate-200">هنوز رویدادی در این بازه ثبت نشده است</p>
                <p className="mt-1 text-xs">با ثبت فعالیت‌های پرونده، نمودار اینجا نمایش داده می‌شود.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4 overflow-hidden rounded-xl bg-slate-50 px-2 py-3 dark:bg-slate-950/50 sm:px-3">
                <svg
                  className="block h-48 w-full sm:h-52"
                  viewBox={`0 0 ${chart.width} ${chart.height}`}
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`نمودار تعداد رویدادها در شش ماه اخیر؛ مجموع ${trendTotal.toLocaleString('fa-IR')} رویداد`}
                  aria-describedby="activity-trend-legend"
                >
                  {tickValues.map(value => {
                    const y = chart.bottom - (value / scaleMax) * (chart.bottom - chart.top)
                    return (
                      <g key={value}>
                        <line x1={chart.left} x2={chart.right} y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
                        <text x={chart.left - 8} y={y + 4} textAnchor="end" className="fill-slate-500 dark:fill-slate-400" fontSize="11">{value.toLocaleString('fa-IR')}</text>
                      </g>
                    )
                  })}
                  <path d={areaPath} className="fill-indigo-100/80 dark:fill-indigo-950/70" />
                  <path d={linePath} fill="none" className="stroke-indigo-600 dark:stroke-indigo-300" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  {points.map((point, index) => (
                    <circle key={trend.fullLabels[index]} cx={point.x} cy={point.y} r="4.5" className="fill-white stroke-indigo-600 dark:fill-slate-900 dark:stroke-indigo-300" strokeWidth="2.5">
                      <title>{trend.fullLabels[index]}: {trend.values[index].toLocaleString('fa-IR')} رویداد</title>
                    </circle>
                  ))}
                </svg>
                <div className="mt-1 grid grid-cols-6 gap-1" dir="rtl">
                  {trend.labels.map((label, index) => (
                    <div key={trend.fullLabels[index]} className="min-w-0 text-center" title={trend.fullLabels[index]}>
                      <span className="block truncate text-[10px] leading-4 text-slate-500 dark:text-slate-400 sm:text-xs">{label}</span>
                      <b className="mt-0.5 block text-[11px] font-semibold text-slate-700 dark:text-slate-200">{trend.values[index].toLocaleString('fa-IR')}</b>
                    </div>
                  ))}
                </div>
              </div>
              <div id="activity-trend-legend" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-300" />رویدادهای ثبت‌شده</span>
                <span>مجموع: {trendTotal.toLocaleString('fa-IR')} رویداد</span>
              </div>
            </>
          )}
        </section>

        <section className={cn(panelBox, 'p-4 sm:p-5')}>
          <h2 className={panelH2}>وضعیت پرونده‌ها</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">بر اساس مرحلهٔ گردش‌کار</p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-end gap-2">
              <b className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{people.length.toLocaleString('fa-IR')}</b>
              <small className="pb-1 text-sm text-slate-500 dark:text-slate-400">کل پرونده</small>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="img" aria-label={`${count('پرونده فعال')} پرونده فعال از ${people.length} پرونده`}>
              <span className="block h-full rounded-full bg-indigo-600 transition-[width] duration-300 dark:bg-indigo-400" style={{ width: `${people.length ? Math.min(100, (count('پرونده فعال') / people.length) * 100) : 0}%` }} />
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ['فعال', count('پرونده فعال'), 'bg-emerald-500'],
              ['در انتظار بررسی', count('بررسی مرکز'), 'bg-amber-500'],
              ['رد شده', count('رد شده'), 'bg-rose-500'],
              ['سایر مراحل', otherCount, 'bg-slate-400'],
            ].map(([label, value, color]) => (
              <div className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300" key={String(label)}>
                <i className={cn('h-2 w-2 shrink-0 rounded-full', String(color))} aria-hidden="true" />
                <dt className="truncate">{label}</dt>
                <dd className="mr-auto font-semibold tabular-nums">{Number(value).toLocaleString('fa-IR')}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={cn(panelBox, 'min-w-0 p-4 sm:p-5')}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className={panelH2}>آخرین پرونده‌ها</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">پرونده‌های دارای آخرین به‌روزرسانی</p>
            </div>
            <Button type="button" variant="ghost" size="xs" onClick={onPersons}>مشاهدهٔ همه</Button>
          </div>
          {people.slice(0, 6).map(person => (
            <Button type="button" className="flex w-full min-w-0 items-center justify-between gap-3 border-t border-slate-100 py-3 text-right first:border-t-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50" key={person.id} onClick={() => onSelect(person)}>
              <span className="flex min-w-0 items-center gap-3">
                <Avatar text={person.firstName?.[0] ?? '؟'} src={person.photo} />
                <b className="min-w-0 truncate text-sm text-slate-800 dark:text-slate-100">
                  {person.firstName} {person.lastName}
                  <small className="mt-1 block truncate text-xs font-normal text-slate-500 dark:text-slate-400">{person.id}</small>
                </b>
              </span>
              <Badge status={person.status} />
              <small className="hidden shrink-0 text-xs text-slate-500 sm:block dark:text-slate-400">{formatServerTimestamp(person.updatedAt, person.ts)}</small>
            </Button>
          ))}
          {!people.length && (
            <div className={cn(emptyBox, 'mt-3 px-3 py-8')}>
              <p>هنوز پرونده‌ای ثبت نشده است.</p>
              {canCreate && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onCreate}>ثبت نخستین پرونده</Button>}
            </div>
          )}
        </section>

        <section className={cn(panelBox, 'min-w-0 p-4 sm:p-5')}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className={panelH2}>فعالیت‌های اخیر</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">آخرین تغییرات ثبت‌شده</p>
            </div>
            {canViewActivities && <Button type="button" variant="ghost" size="xs" onClick={onActivities}>مشاهدهٔ همه</Button>}
          </div>
          {canViewActivities ? activities.slice(0, 5).map(activity => (
            <div className="flex min-w-0 gap-3 border-t border-slate-100 py-3 first:border-t-0 dark:border-slate-800" key={activity.id}>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm text-slate-800 dark:text-slate-100">{activity.action}</b>
                <small className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
                  {activity.personName}
                  {activity.newStatus ? ` · ${activity.newStatus}` : ''}
                </small>
              </span>
              <time className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{formatServerTimestamp(activity.createdAt, activity.ts)}</time>
            </div>
          )) : (
            <div className={cn(emptyBox, 'mt-3 px-3 py-8')}>دسترسی مشاهدهٔ رویدادها برای حساب شما فعال نیست.</div>
          )}
          {canViewActivities && !activities.length && <div className={cn(emptyBox, 'mt-3 px-3 py-8')}>فعالیتی ثبت نشده است.</div>}
        </section>
      </div>
    </>
  )
}
