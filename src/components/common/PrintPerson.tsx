import { nowStamp } from '../../shared'
import { workflow } from '../../app-lib'
import type { Person, Activity, Note } from '../../types'

export function PrintPerson({ person, notes, history }: { person: Person; notes: Note[]; history: Activity[] }) {
  const currentIndex = workflow.indexOf(person.status)
  return (
    <div className="print-area" dir="rtl">
      <header><b>سامانه ناب · خلاصه پرونده</b><span>{nowStamp()}</span></header>
      <section className="pp-head">
        {person.photo && <img src={person.photo} alt="" />}
        <div>
          <h1>{person.firstName} {person.lastName}</h1>
          <p>{person.id} · وضعیت فعلی: {person.status}{(person.tags ?? []).length > 0 ? ` · برچسب‌ها: ${(person.tags ?? []).join('، ')}` : ''}</p>
        </div>
      </section>
      <table>
        <tbody>
          <tr><td>کد ملی</td><td>{person.nationalId}</td><td>تاریخ تولد</td><td>{person.birthDate}</td></tr>
          <tr><td>نام پدر</td><td>{person.fatherName}</td><td>ثبت‌کننده</td><td>{person.updatedBy}</td></tr>
          <tr><td>آخرین به‌روزرسانی</td><td>{person.updatedAt}</td><td>مرحله</td><td>{(currentIndex + 1).toLocaleString('fa-IR')} از {workflow.length.toLocaleString('fa-IR')}</td></tr>
        </tbody>
      </table>
      <h3>مراحل گردش‌کار</h3>
      <ol>
        {workflow.map((s, i) => <li key={s} className={i < currentIndex ? 'd' : i === currentIndex ? 'c' : ''}>{s}{i === currentIndex ? ' ← وضعیت فعلی' : ''}</li>)}
      </ol>
      <h3>تاریخچه پرونده</h3>
      {history.slice(0, 12).map(a => <p key={a.id}>• {a.action}{a.previousStatus && a.newStatus ? ` (از «${a.previousStatus}» به «${a.newStatus}»)` : ''} — {a.createdBy} — {a.createdAt}</p>)}
      {!history.length && <p>رویدادی ثبت نشده است.</p>}
      <h3>یادداشت‌ها</h3>
      {notes.slice(0, 10).map(n => <p key={n.id}>💬 {n.author}: {n.text} ({n.createdAt})</p>)}
      {!notes.length && <p>یادداشتی ثبت نشده است.</p>}
      <footer>سامانه مدیریت پرونده ناب · این سند به‌صورت خودکار تولید شده است</footer>
    </div>
  )
}
