import { Button } from '../common/Button'
import { Avatar, Heading } from '../../shared-ui'
import type { Status, Person, Activity } from '../../types'
import { Badge } from '../common/Badge'
import { cn, emptyBox, panelBox, panelH2 } from '../ui'

export function Dashboard({
  people,
  activities,
  trend,
  canCreate,
  onCreate,
  onPersons,
  onSelect,
  greeting,
}: {
  people: Person[]
  activities: Activity[]
  trend: { labels: string[]; values: number[] }
  canCreate: boolean
  onCreate: () => void
  onPersons: () => void
  onSelect: (p: Person) => void
  greeting: string
}) {
  const count = (s: Status) => people.filter(p => p.status === s).length
  const otherCount = people.length - count('پرونده فعال') - count('بررسی مرکز') - count('رد شده')
  return (
    <>
      <Heading
        title={greeting}
        subtitle="در یک نگاه وضعیت پرونده‌ها و فعالیت‌های سامانه را بررسی کنید."
        action={
          canCreate ? (
            <Button variant="primary" onClick={onCreate}>
               ثبت فرد جدید
            </Button>
          ) : (
            <Button variant="outline" onClick={onPersons}>
               مشاهده افراد
            </Button>
          )
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ['کل افراد', people.length],
            ['درخواست‌های جدید', count('درخواست پرونده')],
            ['پرونده‌های فعال', count('پرونده فعال')],
            ['در انتظار بررسی', count('بررسی مرکز')],
          ] as const
        ).map(([label, value]) => (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900" key={label}>
            <span className="min-w-0 text-sm text-slate-500 dark:text-slate-400">
              {label}
              <b className="mt-1 block text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{Number(value).toLocaleString('fa-IR')}</b>
              <small className="mt-1 block text-xs">در سامانه ثبت شده</small>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className={cn(panelBox, 'p-4 sm:p-5 xl:col-span-2')}>
          <h2 className={panelH2}>
            روند پرونده‌ها <small>رویدادهای ثبت‌شده در ۶ ماه گذشته · داده واقعی</small>
          </h2>
          <div className="mt-5 overflow-x-auto rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
            <svg viewBox="0 0 600 180" preserveAspectRatio="none">
              {(() => {
                const max = Math.max(...trend.values, 1)
                const denom = Math.max(1, trend.values.length - 1)
                const pts = trend.values.map((v, i) => ({
                  x: (i / denom) * 600,
                  y: 165 - (v / max) * 145,
                }))
                const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${Math.round(p.x)} ${Math.round(p.y)}`).join(' ')
                const dark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
                return (
                  <>
                    <path d={`${line} L600 180 L0 180 Z`} fill={dark ? '#1c2650' : '#e8ecff'} />
                    <path d={line} fill="none" stroke="#5267f5" strokeWidth="3" strokeLinejoin="round" />
                    {pts.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="4" fill="#5267f5" />
                    ))}
                    {pts.map(
                      (p, i) =>
                        trend.values[i] > 0 && (
                          <text key={`t${i}`} x={p.x} y={p.y - 9} fontSize="13" fill={dark ? '#9fb0ff' : '#5267f5'} textAnchor="middle">
                            {trend.values[i].toLocaleString('fa-IR')}
                          </text>
                        ),
                    )}
                  </>
                )
              })()}
            </svg>
            <div className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">{trend.labels.join(' - ')}</div>
          </div>
        </section>
        <section className={cn(panelBox, 'p-4 sm:p-5')}>
          <h2 className={panelH2}>
            وضعیت پرونده‌ها <small>بر اساس مرحله‌ی گردش‌کار</small>
          </h2>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-end gap-2">
              <b className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{people.length.toLocaleString('fa-IR')}</b>
              <small className="pb-1 text-sm text-slate-500 dark:text-slate-400">کل پرونده</small>
            </div>
          </div>
          <div className="mt-4 space-y-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            فعال {count('پرونده فعال').toLocaleString('fa-IR')}
            <br />در انتظار بررسی {count('بررسی مرکز').toLocaleString('fa-IR')}
            <br />رد شده {count('رد شده').toLocaleString('fa-IR')}
            <br />سایر {Math.max(0, otherCount).toLocaleString('fa-IR')}
          </div>
        </section>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={cn(panelBox, 'p-4 sm:p-5')}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2>آخرین افراد ثبت‌شده</h2>
            <Button variant="ghost" size="sm" onClick={onPersons} className="text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40">مشاهده همه</Button>
          </div>
          {people.slice(0, 6).map(p => (
            <Button type="button" className="flex w-full items-center justify-between gap-3 border-t border-slate-100 py-3 text-right first:border-t-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50" key={p.id} onClick={() => onSelect(p)}>
              <span className="flex min-w-0 items-center gap-3">
                <Avatar text={p.firstName[0]} src={p.photo} />
                <b className="min-w-0 text-sm text-slate-800 dark:text-slate-100">
                  {p.firstName} {p.lastName}
                  <small className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">{p.id}</small>
                </b>
              </span>
              <Badge status={p.status} />
              <small className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">{p.updatedAt}</small>
            </Button>
          ))}
        </section>
        <section className={cn(panelBox, 'p-4 sm:p-5')}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2>فعالیت‌های اخیر</h2>
          </div>
          {activities.slice(0, 5).map(a => (
            <div className="flex gap-3 border-t border-slate-100 py-3 first:border-t-0 dark:border-slate-800" key={a.id}>
              <span className="min-w-0 flex-1">
                <b className="block text-sm text-slate-800 dark:text-slate-100">{a.action}</b>
                <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  {a.personName}
                  {a.newStatus ? ` · ${a.newStatus}` : ''}
                </small>
              </span>
              <time className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{a.createdAt}</time>
            </div>
          ))}
          {!activities.length && <div className={emptyBox}>فعالیتی ثبت نشده است</div>}
        </section>
      </div>
    </>
  )
}
