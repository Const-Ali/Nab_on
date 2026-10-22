import { Button } from '../../components/common/Button'
import TaskCard from './TaskCard'
import type { WorkTask } from '../types'
import { emptyBox } from '../../components/ui'

export default function TaskList({ tasks, hasAny, filtered, onOpen, onToggle, onCreate, canCreate, canChangeStatus }: { tasks: WorkTask[]; hasAny: boolean; filtered: boolean; onOpen: (t: WorkTask) => void; onToggle: (t: WorkTask) => void; onCreate: () => void; canCreate: boolean; canChangeStatus: boolean }) {
  if (!tasks.length) return <div className={emptyBox}>{hasAny && filtered ? 'کاری با فیلترهای فعلی پیدا نشد.' : <><b className="block text-base text-slate-800 dark:text-slate-100">هنوز کاری ثبت نشده است</b><p className="mt-2">اولین کار خود را بسازید و آن را پیگیری کنید.</p>{canCreate && <Button type="button" variant="primary" className="mt-4" onClick={onCreate}>ایجاد اولین کار</Button>}</>}</div>
  return <div className="divide-y divide-slate-100 dark:divide-slate-800">{tasks.map(task => <TaskCard key={task.id} task={task} onOpen={onOpen} onToggle={onToggle} canToggle={canChangeStatus} />)}</div>
}
