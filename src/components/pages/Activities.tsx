import { Heading, Icon } from '../../shared-ui'
import type { Activity } from '../../types'
import { Badge } from '../common/Badge'
import { btnOutline, emptyBox, panelBox } from '../ui'

export function Activities({ activities, onExport }: { activities: Activity[]; onExport: () => void }) {
  return (
    <>
      <Heading title="گزارش فعالیت‌ها" subtitle="Activity Log تاریخچه‌ی دائمی تغییرات پرونده‌هاست و قابل حذف نیست." action={<button className={btnOutline} onClick={onExport}><Icon name="download" /> خروجی اکسل</button>} />
      <section className={panelBox}>
        {activities.map(a => (
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center sm:px-5 dark:border-slate-800" key={a.id}>
            <i className="h-2 w-2 rounded-full bg-indigo-500" />
            <span className="min-w-0"><b className="block text-sm text-slate-800 dark:text-slate-100">{a.action}</b><small className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{a.personName}{a.rejectionReason ? ` · علت رد: ${a.rejectionReason}` : ''}</small></span>
            {a.newStatus && <Badge status={a.newStatus} />}<time className="text-xs text-slate-500 dark:text-slate-400">{a.createdAt}</time><em className="text-xs not-italic text-slate-500 dark:text-slate-400">{a.createdBy}</em>
          </div>
        ))}
        {!activities.length && <div className={emptyBox}>فعالیتی ثبت نشده است</div>}
      </section>
    </>
  )
}
