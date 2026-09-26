import TaskCard from './TaskCard'
import type { WorkTask } from '../types'
import { btnPrimary, emptyBox } from '../../components/ui'

export default function TaskList({ tasks, hasAny, filtered, onOpen, onToggle, onCreate }: { tasks: WorkTask[]; hasAny: boolean; filtered: boolean; onOpen: (t: WorkTask) => void; onToggle: (t: WorkTask) => void; onCreate: () => void }) {
  if (!tasks.length) return <div className={emptyBox}>{hasAny && filtered ? 'کاری با فیلترهای فعلی پیدا نشد.' : <><b className="block text-base text-slate-800 dark:text-slate-100">هنوز کاری ثبت نشده است</b><p className="mt-2">اولین کار خود را بسازید و آن را پیگیری کنید.</p><button type="button" className={`${btnPrimary} mt-4`} onClick={onCreate}> ایجاد اولین کار</button></>}</div>
  return <div className="divide-y divide-slate-100 dark:divide-slate-800">{tasks.map(task => <TaskCard key={task.id} task={task} onOpen={onOpen} onToggle={onToggle} />)}</div>
}
