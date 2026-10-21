import { formatServerTimestamp, nowStamp, toPersianDigits } from '../../shared'
import type { Person, Activity, Note } from '../../types'
import type { WorkflowConfig } from '../../workflow'
import { stageById, stageIdForPerson } from '../../workflow'
import { QRCodeSvg } from './QRCodeSvg'

export function PrintPerson({ person, notes, history, workflowConfig }: { person: Person; notes: Note[]; history: Activity[]; workflowConfig: WorkflowConfig }) {
  const workflowStages = workflowConfig.stages
  const currentStageId = stageIdForPerson(person, workflowConfig)
  const currentStage = stageById(workflowConfig, currentStageId)
  const currentIndex = workflowStages.findIndex(stage => stage.id === currentStageId)
  const qrData = `https://nab.internal/verify/person?id=${person.id}&nid=${person.nationalId}&ts=${encodeURIComponent(String(person.ts ?? person.updatedAt))}`

  return (
    <div className="print-area print-official-form" dir="rtl">
      {/* سربرگ رسمی با نشان سازمانی و بارکد */}
      <div className="print-official-header">
        <div className="print-header-emblem">
          <div className="print-emblem-badge">ناب</div>
          <div>
            <h2>جمهوری اسلامی ایران</h2>
            <h3>سامانه یکپارچه مدیریت پرونده و کارها (ناب)</h3>
            <small>شناسنامه الکترونیکی پرونده پرسنلی</small>
          </div>
        </div>
        <div className="print-header-meta">
          <div>شماره پرونده: <b>{person.id}</b></div>
          <div>تاریخ صدور: <b>{nowStamp()}</b></div>
          <div>کد پیگیری امنیتی: <b>{toPersianDigits(Math.abs(person.id.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString().slice(0, 8))}</b></div>
        </div>
        <div className="print-header-qr">
          <QRCodeSvg value={qrData} size={70} />
          <small>اسکن جهت استعلام</small>
        </div>
      </div>

      <section className="pp-head">
        {person.photo ? (
          <img src={person.photo} alt={person.firstName} />
        ) : (
          <div className="print-no-photo">{person.firstName[0]}</div>
        )}
        <div>
          <h1>{person.firstName} {person.lastName}</h1>
          <p>
            شناسه پرونده: <b>{person.id}</b> · وضعیت: <b>{currentStage?.label ?? person.status}</b>
            {(person.tags ?? []).length > 0 ? ` · برچسب‌ها: ${(person.tags ?? []).join('، ')}` : ''}
          </p>
        </div>
      </section>

      <table className="print-table">
        <tbody>
          <tr>
            <td>کد ملی</td>
            <td><b>{person.nationalId}</b></td>
            <td>تاریخ تولد</td>
            <td><b>{person.birthDate}</b></td>
          </tr>
          <tr>
            <td>نام پدر</td>
            <td><b>{person.fatherName}</b></td>
            <td>ثبت‌کننده پرونده</td>
            <td><b>{person.updatedBy}</b></td>
          </tr>
          <tr>
            <td>آخرین اقدام</td>
            <td><b>{formatServerTimestamp(person.updatedAt, person.ts)}</b></td>
            <td>مرحله جاری</td>
            <td><b>{(currentIndex + 1).toLocaleString('fa-IR')} از {workflowStages.length.toLocaleString('fa-IR')} ({currentStage?.label ?? person.status})</b></td>
          </tr>
          {person.deadline && (
            <tr>
              <td>مهلت سررسید</td>
              <td><b>{person.deadline}</b></td>
              <td>کارشناس مسئول</td>
              <td><b>{person.assignee || 'ثبت عمومی'}</b></td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>مراحل گردش‌کار پرونده</h3>
      <ol className="print-steps">
        {workflowStages.map((stage, i) => (
          <li key={stage.id} className={i < currentIndex ? 'd' : i === currentIndex ? 'c' : ''}>
            {stage.label}{stage.archived ? ' (بایگانی)' : ''} {i === currentIndex && '(مرحله جاری)'}
          </li>
        ))}
      </ol>

      <h3>تاریخچه رویدادها و تغییرات</h3>
      <div className="print-log">
        {history.slice(0, 10).map(a => (
          <p key={a.id}>
            <b>{a.action}</b> {a.previousStatus && a.newStatus ? ` (از «${a.previousStatus}» به «${a.newStatus}»)` : ''} — {a.createdBy} ({formatServerTimestamp(a.createdAt, a.ts)})
          </p>
        ))}
        {!history.length && <p>رویدادی ثبت نشده است.</p>}
      </div>

      {notes.length > 0 && (
        <>
          <h3>یادداشت‌ها و مکاتبات کارشناسی</h3>
          <div className="print-notes">
            {notes.slice(0, 8).map(n => (
              <p key={n.id}>
                <b>{n.author} ({n.title}):</b> {n.text} — <small>{formatServerTimestamp(n.createdAt, n.ts)}</small>
              </p>
            ))}
          </div>
        </>
      )}

      {/* بخش مهر و امضای رسمی کارشناس و مدیر */}
      <div className="print-signatures">
        <div className="print-sign-box">
          <span>امضای کارشناس ثبت‌کننده</span>
          <div className="print-sign-space" />
          <small>{person.updatedBy}</small>
        </div>
        <div className="print-sign-box">
          <span>مهر و تأیید رئیس واحد / مدیر سامانه</span>
          <div className="print-sign-space" />
          <small>مهر برجسته و امضا</small>
        </div>
      </div>

      <footer>
        این سند رسمی از سامانه ناب استخراج گردیده و دارای اعتبار اداری و کد استعلام یکتا می‌باشد.
      </footer>
    </div>
  )
}
