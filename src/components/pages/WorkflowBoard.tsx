import { Button } from '../common/Button'
import { useState } from 'react'
import { Avatar, Heading } from '../../shared-ui'
import { workflow } from '../../app-lib'
import type { Status, Person } from '../../types'
import { cn, panelBox } from '../ui'

export function WorkflowBoard({ people, canChange, onSelect, onDropPerson }: { people: Person[]; canChange: boolean; onSelect: (p: Person) => void; onDropPerson: (personId: string, target: Status) => void }) {
  const [over, setOver] = useState<Status | null>(null)
  return (
    <>
      <Heading
        title="گردش‌کار پرونده"
        subtitle={canChange ? 'پرونده‌ها را با موس بین مراحل بکشید و رها کنید؛ فقط انتقال‌های مجاز انجام می‌شود.' : 'نمای کلی وضعیت پرونده‌ها در مراحل گردش‌کار.'}
      />
      <div className="grid grid-flow-col auto-cols-[minmax(17rem,1fr)] gap-4 overflow-x-auto pb-3 lg:grid-flow-row lg:grid-cols-3 xl:grid-cols-4">
        {workflow.map((status, i) => (
          <section
            key={status}
            className={cn(panelBox, 'min-h-52 p-3 transition-colors duration-200', over === status && 'border-indigo-400 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/20')}
            onDragOver={e => { if (canChange) { e.preventDefault(); setOver(status) } }}
            onDragLeave={() => setOver(cur => (cur === status ? null : cur))}
            onDrop={e => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/person'); if (id) onDropPerson(id, status) }}
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><b className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{(i + 1).toLocaleString('fa-IR')}</b>{status}<small className="mr-auto rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{people.filter(p => p.status === status).length.toLocaleString('fa-IR')} پرونده</small></h3>
            {people.filter(p => p.status === status).map(p => (
              <Button
                type="button"
                key={p.id}
                onClick={() => onSelect(p)}
                draggable={canChange}
                className="mb-2 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-right shadow-sm hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20"
                title={canChange ? 'برای جابه‌جایی بکشید یا برای مشاهده جزئیات کلیک کنید' : 'مشاهده جزئیات پرونده'}
                onDragStart={e => {
                  if (canChange) {
                    e.dataTransfer.setData('text/person', p.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }
                }}
              >
                <Avatar text={p.firstName[0]} src={p.photo} />
                <span className="min-w-0">
                  <b className="block truncate text-sm text-slate-800 dark:text-slate-100">{p.firstName} {p.lastName}</b>
                  <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{p.id}</small>
                </span>
              </Button>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}
