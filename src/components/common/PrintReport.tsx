import { jalaliMonthNames, jalaliParts, nowStamp, toPersianDigits } from '../../shared'
import { workflow, activityMonth, computeUserStats, computeBottlenecks } from '../../app-lib'
import type { Person, Activity } from '../../types'
import { QRCodeSvg } from './QRCodeSvg'

export function PrintReport({ people, activities, printedBy }: { people: Person[]; activities: Activity[]; printedBy: string }) {
  const todayJ = jalaliParts(new Date())
  const monthName = jalaliMonthNames[todayJ.m - 1]
  const monthActs = activities.filter(a => {
    const am = activityMonth(a)
    return am && am.y === todayJ.y && am.m === todayJ.m
  })
  const userStats = computeUserStats(monthActs)
  const bottlenecks = computeBottlenecks(monthActs)
  const qrData = `https://nab.internal/verify/report?m=${todayJ.m}&y=${todayJ.y}&total=${people.length}&by=${encodeURIComponent(printedBy)}`

  return (
    <div className="print-area print-report print-official-form" dir="rtl">
      <div className="print-official-header">
        <div className="print-header-emblem">
          <div className="print-emblem-badge">ناب</div>
          <div>
            <h2>جمهوری اسلامی ایران</h2>
            <h3>سامانه یکپارچه مدیریت پرونده و کارها (ناب)</h3>
            <small>گزارش رسمی عملکرد ماهانه و تحلیل گردش‌کار</small>
          </div>
        </div>
        <div className="print-header-meta">
          <div>دوره گزارش: <b>{monthName} ماه {toPersianDigits(todayJ.y)}</b></div>
          <div>تاریخ چاپ: <b>{nowStamp()}</b></div>
          <div>تنظیم‌کننده: <b>{printedBy}</b></div>
        </div>
        <div className="print-header-qr">
          <QRCodeSvg value={qrData} size={70} />
          <small>اصالت‌سنجی گزارش</small>
        </div>
      </div>

      <h3>شاخص‌های کلیدی عملکرد</h3>
      <table className="print-table">
        <tbody>
          <tr>
            <td>کل پرونده‌های ثبت‌شده</td>
            <td><b>{people.length.toLocaleString('fa-IR')}</b></td>
            <td>کل رویدادهای ماه جاری</td>
            <td><b>{monthActs.length.toLocaleString('fa-IR')}</b></td>
          </tr>
          <tr>
            <td>پرونده‌های فعال و جاری</td>
            <td><b>{people.filter(p => p.status === 'پرونده فعال').length.toLocaleString('fa-IR')}</b></td>
            <td>پرونده‌های رد شده</td>
            <td><b>{people.filter(p => p.status === 'رد شده').length.toLocaleString('fa-IR')}</b></td>
          </tr>
          <tr>
            <td>در انتظار بررسی مرکز</td>
            <td><b>{people.filter(p => p.status === 'بررسی مرکز').length.toLocaleString('fa-IR')}</b></td>
            <td>مراحل پایان‌یافته</td>
            <td><b>{people.filter(p => p.status === 'پایان کار').length.toLocaleString('fa-IR')}</b></td>
          </tr>
        </tbody>
      </table>

      <h3>توزیع آماری پرونده‌ها در مراحل گردش‌کار</h3>
      <table className="print-table">
        <tbody>
          {workflow.map(s => (
            <tr key={s}>
              <td>{s}</td>
              <td colSpan={3}>
                <b>{people.filter(p => p.status === s).length.toLocaleString('fa-IR')} پرونده</b>
                {' '}({people.length > 0 ? ((people.filter(p => p.status === s).length / people.length) * 100).toFixed(1).replace('.', '٫').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) : '۰'}٪)
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>ارزیابی عملکرد کاربران و کارشناسان</h3>
      {userStats.length ? (
        <table className="print-table">
          <thead>
            <tr>
              <th>نام کاربر</th>
              <th>ثبت جدید</th>
              <th>تغییر وضعیت</th>
              <th>مکاتبات / یادداشت</th>
              <th>مجموع فعالیت</th>
            </tr>
          </thead>
          <tbody>
            {userStats.map(([name, s]) => (
              <tr key={name}>
                <td><b>{name}</b></td>
                <td>{s.creates.toLocaleString('fa-IR')}</td>
                <td>{s.changes.toLocaleString('fa-IR')}</td>
                <td>{s.notes.toLocaleString('fa-IR')}</td>
                <td><b>{s.total.toLocaleString('fa-IR')}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>داده‌ای در این بازه ثبت نشده است.</p>
      )}

      <h3>گلوگاه‌های زمانی گردش‌کار</h3>
      {bottlenecks.some(b => b.count > 0) ? (
        <table className="print-table">
          <tbody>
            {bottlenecks
              .filter(b => b.count > 0)
              .map(b => (
                <tr key={b.status}>
                  <td>{b.status}</td>
                  <td colSpan={3}>
                    میانگین مدت توقف: <b>{b.label}</b> (تعداد پرونده‌های بررسی‌شده: {b.count.toLocaleString('fa-IR')})
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      ) : (
        <p>داده کافی برای محاسبه گلوگاه در این ماه ثبت نشده است.</p>
      )}

      <div className="print-signatures">
        <div className="print-sign-box">
          <span>کارشناس تهیه‌کننده گزارش</span>
          <div className="print-sign-space" />
          <small>{printedBy}</small>
        </div>
        <div className="print-sign-box">
          <span>مقام تأییدکننده و ریاست</span>
          <div className="print-sign-space" />
          <small>مهر و امضا</small>
        </div>
      </div>

      <footer>
        گزارش رسمی ماهانه · سامانه مدیریت پرونده و کارها (ناب) · تولید خودکار با شناسه امنیتی
      </footer>
    </div>
  )
}
