import { Heading, Icon } from '../../shared-ui'
import type { Activity } from '../../types'
import { Badge } from '../common/Badge'

export function Activities({ activities, onExport }: { activities: Activity[]; onExport: () => void }) {
  return (
    <>
      <Heading title="گزارش فعالیت‌ها" subtitle="Activity Log تاریخچه‌ی دائمی تغییرات پرونده‌هاست و قابل حذف نیست." action={<button className="outline" onClick={onExport}><Icon name="download" /> خروجی اکسل</button>} />
      <section className="panel activity-table">
        {activities.map(a => (
          <div className="activity-row" key={a.id}>
            <i className="dot d1" />
            <span><b>{a.action}</b><small>{a.personName}{a.rejectionReason ? ` · علت رد: ${a.rejectionReason}` : ''}</small></span>
            {a.newStatus && <Badge status={a.newStatus} />}<time>{a.createdAt}</time><em>{a.createdBy}</em>
          </div>
        ))}
        {!activities.length && <div className="empty">فعالیتی ثبت نشده است</div>}
      </section>
    </>
  )
}
