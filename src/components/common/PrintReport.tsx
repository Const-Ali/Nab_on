import { jalaliMonthNames, jalaliParts, nowStamp } from '../../shared'
import { workflow, activityMonth, computeUserStats, computeBottlenecks } from '../../app-lib'
import type { Person, Activity } from '../../types'

export function PrintReport({ people, activities, printedBy }: { people: Person[]; activities: Activity[]; printedBy: string }) {
  const todayJ = jalaliParts(new Date())
  const monthName = jalaliMonthNames[todayJ.m - 1]
  const monthActs = activities.filter(a => { const am = activityMonth(a); return am && am.y === todayJ.y && am.m === todayJ.m })
  const userStats = computeUserStats(monthActs)
  const bottlenecks = computeBottlenecks(monthActs)
  return (
    <div className="print-area print-report" dir="rtl">
      <header><b>سامانه ناب · گزارش ماه {monthName} {todayJ.y.toLocaleString('fa-IR')}</b><span>{nowStamp()}</span></header>
      <h3>شاخص‌های کلی</h3>
      <table>
        <tbody>
          <tr><td>کل پرونده‌ها</td><td>{people.length.toLocaleString('fa-IR')}</td><td>رویدادهای این ماه</td><td>{monthActs.length.toLocaleString('fa-IR')}</td></tr>
          <tr><td>پرونده‌های فعال</td><td>{people.filter(p => p.status === 'پرونده فعال').length.toLocaleString('fa-IR')}</td><td>رد شده</td><td>{people.filter(p => p.status === 'رد شده').length.toLocaleString('fa-IR')}</td></tr>
          <tr><td>در انتظار بررسی</td><td>{people.filter(p => p.status === 'بررسی مرکز').length.toLocaleString('fa-IR')}</td><td>پایان‌یافته</td><td>{people.filter(p => p.status === 'پایان کار').length.toLocaleString('fa-IR')}</td></tr>
        </tbody>
      </table>
      <h3>وضعیت پرونده‌ها بر اساس مرحله</h3>
      <table>
        <tbody>
          {workflow.map(s => (
            <tr key={s}><td>{s}</td><td colSpan={3}>{people.filter(p => p.status === s).length.toLocaleString('fa-IR')} پرونده</td></tr>
          ))}
        </tbody>
      </table>
      <h3>عملکرد کاربران</h3>
      {userStats.length ? (
        <table>
          <tbody>
            {userStats.map(([name, s]) => <tr key={name}><td>{name}</td><td>ثبت: {s.creates.toLocaleString('fa-IR')}</td><td>تغییر وضعیت: {s.changes.toLocaleString('fa-IR')}</td><td>یادداشت: {s.notes.toLocaleString('fa-IR')}</td></tr>)}
          </tbody>
        </table>
      ) : <p>داده‌ای موجود نیست.</p>}
      <h3>گلوگاه‌های گردش‌کار</h3>
      {bottlenecks.some(b => b.count > 0) ? (
        <table>
          <tbody>
            {bottlenecks.filter(b => b.count > 0).map(b => <tr key={b.status}><td>{b.status}</td><td colSpan={3}>میانگین توقف: {b.label} ({b.count.toLocaleString('fa-IR')} پرونده)</td></tr>)}
          </tbody>
        </table>
      ) : <p>داده کافی موجود نیست.</p>}
      <footer>تهیه‌کننده: {printedBy} · سامانه مدیریت پرونده ناب</footer>
    </div>
  )
}
