import { Button } from '../common/Button'
import { formatServerTimestamp } from '../../shared'
import { Heading } from '../../shared-ui'
import type { Activity } from '../../types'
import { Badge } from '../common/Badge'
import { emptyBox, panelBox } from '../ui'

function activityDetails(activity: Activity): string {
  if (activity.details) return activity.details
  if (!activity.rejectionReason) return ''
  return activity.action === 'رد پرونده'
    ? `علت رد: ${activity.rejectionReason}`
    : `جزئیات: ${activity.rejectionReason}`
}

export function Activities({ activities, canExport, onExport }: { activities: Activity[]; canExport: boolean; onExport: () => void }) {
  return (
    <>
      <Heading title="گزارش فعالیت‌ها" subtitle="تاریخچهٔ ثبت، ویرایش، ارجاع، تغییر مرحله و حذف پرونده‌ها؛ رویدادها قابل حذف یا ویرایش نیستند." action={canExport ? <Button variant="outline" onClick={onExport}>خروجی CSV</Button> : undefined} />
      <section className={panelBox}>
        {activities.map(activity => {
          const details = activityDetails(activity)
          const status = activity.newStatus ?? (activity.action === 'حذف پرونده' ? activity.previousStatus : null)
          return (
            <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center sm:px-5 dark:border-slate-800" key={activity.id}>
              <span className="min-w-0">
                <b className="block text-sm text-slate-800 dark:text-slate-100">{activity.action}</b>
                <small className="mt-1 block whitespace-normal break-words text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {activity.personName}{details ? ` · ${details}` : ''}
                </small>
              </span>
              {status && <Badge status={status} />}
              <time className="text-xs text-slate-500 dark:text-slate-400">{formatServerTimestamp(activity.createdAt, activity.ts)}</time>
              <em className="text-xs not-italic text-slate-500 dark:text-slate-400">{activity.createdBy}</em>
            </div>
          )
        })}
        {!activities.length && <div className={emptyBox}>فعالیتی ثبت نشده است</div>}
      </section>
    </>
  )
}
