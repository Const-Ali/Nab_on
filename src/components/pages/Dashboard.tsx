import { Avatar, Heading, Icon } from '../../shared-ui'
import type { Status, Person, Activity } from '../../types'
import { Badge } from '../common/Badge'

export function Dashboard({ people, activities, trend, canCreate, onCreate, onPersons, onSelect, greeting }: { people: Person[]; activities: Activity[]; trend: { labels: string[]; values: number[] }; canCreate: boolean; onCreate: () => void; onPersons: () => void; onSelect: (p: Person) => void; greeting: string }) {
  const ACTIVITY_DOTS = ['#5267f5', '#28b77a', '#f1a83a', '#ed6a6a', '#8b5cf6']
  const count = (s: Status) => people.filter(p => p.status === s).length
  const otherCount = people.length - count('پرونده فعال') - count('بررسی مرکز') - count('رد شده')
  const segments: [number, string][] = [[count('پرونده فعال'), '#28b77a'], [count('بررسی مرکز'), '#f1a83a'], [count('رد شده'), '#ed6a6a'], [otherCount, '#99a3b5']]
  let acc = 0
  const total = Math.max(people.length, 1)
  const donutGradient = segments.map(([value, color]) => { const from = acc; acc += (value / total) * 100; return `${color} ${from}% ${acc}%` }).join(',')
  return (
    <>
      <Heading title={greeting} subtitle="در یک نگاه وضعیت پرونده‌ها و فعالیت‌های سامانه را بررسی کنید." action={canCreate ? <button className="primary" onClick={onCreate}><Icon name="plus" /> ثبت فرد جدید</button> : <button className="outline" onClick={onPersons}>مشاهده افراد ←</button>} />
      <div className="stats">
        {([['کل افراد', people.length, 'blue'], ['درخواست‌های جدید', count('درخواست پرونده'), 'amber'], ['پرونده‌های فعال', count('پرونده فعال'), 'green'], ['در انتظار بررسی', count('بررسی مرکز'), 'purple']] as const).map(([label, value, color]) => (
          <div className="stat" key={label}>
            <div className={`stat-icon ${color}`}><Icon name="users" /></div>
            <span>{label}<b>{Number(value).toLocaleString('fa-IR')}</b><small>در سامانه ثبت شده</small></span>
          </div>
        ))}
      </div>
      <div className="grid2">
        <section className="panel">
          <h2>روند پرونده‌ها <small>رویدادهای ثبت‌شده در ۶ ماه گذشته · داده واقعی</small></h2>
          <div className="chart">
            <svg viewBox="0 0 600 180" preserveAspectRatio="none">
              {(() => {
                const max = Math.max(...trend.values, 1)
                const pts = trend.values.map((v, i) => ({ x: (i / (trend.values.length - 1)) * 600, y: 165 - (v / max) * 145 }))
                const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${Math.round(p.x)} ${Math.round(p.y)}`).join(' ')
                const dark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
                return <>
                  <path d={`${line} L600 180 L0 180 Z`} fill={dark ? '#1c2650' : '#e8ecff'} />
                  <path d={line} fill="none" stroke="#5267f5" strokeWidth="3" strokeLinejoin="round" />
                  {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#5267f5" />)}
                  {pts.map((p, i) => trend.values[i] > 0 && <text key={`t${i}`} x={p.x} y={p.y - 9} fontSize="13" fill={dark ? '#9fb0ff' : '#5267f5'} textAnchor="middle">{trend.values[i].toLocaleString('fa-IR')}</text>)}
                </>
              })()}
            </svg>
            <div>{trend.labels.join(' - ')}</div>
          </div>
        </section>
        <section className="panel">
          <h2>وضعیت پرونده‌ها <small>بر اساس مرحله‌ی گردش‌کار</small></h2>
          <div className="donut" style={{ background: `conic-gradient(${donutGradient})` }}><div><b>{people.length.toLocaleString('fa-IR')}</b><small>کل پرونده</small></div></div>
          <div className="legend">● فعال {count('پرونده فعال').toLocaleString('fa-IR')}<br />● در انتظار بررسی {count('بررسی مرکز').toLocaleString('fa-IR')}<br />● رد شده {count('رد شده').toLocaleString('fa-IR')}<br />● سایر {otherCount.toLocaleString('fa-IR')}</div>
        </section>
      </div>
      <div className="grid2">
        <section className="panel">
          <div className="panel-title"><h2>آخرین افراد ثبت‌شده</h2><button onClick={onPersons}>مشاهده همه ←</button></div>
          {people.slice(0, 6).map(p => (
            <div className="mini-row" key={p.id} onClick={() => onSelect(p)}>
              <span><Avatar text={p.firstName[0]} src={p.photo} /><b>{p.firstName} {p.lastName}<small>{p.id}</small></b></span>
              <Badge status={p.status} /><small>{p.updatedAt}</small>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-title"><h2>فعالیت‌های اخیر</h2></div>
          {activities.slice(0, 5).map((a, i) => (
            <div className="activity" key={a.id}>
              <i className="mt-[5px] h-[9px] w-[9px] flex-[0_0_9px] rounded-full" style={{ background: ACTIVITY_DOTS[i % 5] }} />
              <span><b>{a.action}</b><small>{a.personName}{a.newStatus ? ` · ${a.newStatus}` : ''}</small></span>
              <time>{a.createdAt}</time>
            </div>
          ))}
          {!activities.length && <div className="empty">فعالیتی ثبت نشده است</div>}
        </section>
      </div>
    </>
  )
}
