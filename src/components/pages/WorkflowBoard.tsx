import { useMemo, useState } from 'react'
import { Button } from '../common/Button'
import { Avatar, Heading } from '../../shared-ui'
import { workflow } from '../../app-lib'
import type { Status, Person } from '../../types'
import { cn, emptyBox, panelBox } from '../ui'

export function WorkflowBoard({ people, canChange, onSelect, onDropPerson }: { people: Person[]; canChange: boolean; onSelect: (p: Person) => void; onDropPerson: (personId: string, target: Status) => void }) {
  const [over, setOver] = useState<Status | null>(null)
  const groupedPeople = useMemo(() => {
    const groups = new Map<Status, Person[]>(workflow.map(status => [status, []]))
    for (const person of people) groups.get(person.status)?.push(person)
    return groups
  }, [people])

  return (
    <>
      <Heading
        title="گردش‌کار پرونده"
        subtitle={canChange
          ? 'در نمایشگر بزرگ، پرونده را با موس جابه‌جا کنید. در موبایل یا با صفحه‌کلید، کارت را باز کنید و وضعیت را از جزئیات پرونده تغییر دهید.'
          : 'نمای کلی پرونده‌ها در مراحل گردش‌کار؛ برای دیدن جزئیات، کارت را انتخاب کنید.'}
      />
      <div
        className="grid grid-flow-col auto-cols-[minmax(17rem,1fr)] gap-3 overflow-x-auto overscroll-x-contain pb-3 sm:gap-4 lg:grid-flow-row lg:grid-cols-3 xl:grid-cols-4"
        role="region"
        aria-label="ستون‌های مراحل گردش‌کار پرونده؛ در موبایل برای دیدن همهٔ مراحل به‌صورت افقی پیمایش کنید"
        tabIndex={0}
      >
        {workflow.map((status, i) => {
          const items = groupedPeople.get(status) ?? []
          return (
            <section
              key={status}
              className={cn(panelBox, 'min-h-52 min-w-0 p-3 transition-colors duration-200', over === status && 'border-indigo-400 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/20')}
              aria-labelledby={`workflow-stage-${i}`}
              onDragOver={event => {
                if (canChange) {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setOver(status)
                }
              }}
              onDragLeave={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setOver(current => current === status ? null : current)
                }
              }}
              onDrop={event => {
                event.preventDefault()
                setOver(null)
                if (!canChange) return
                const id = event.dataTransfer.getData('text/person')
                if (id) onDropPerson(id, status)
              }}
            >
              <h3 id={`workflow-stage-${i}`} className="mb-3 flex items-start gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <b className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{(i + 1).toLocaleString('fa-IR')}</b>
                <span className="min-w-0 flex-1 pt-1 leading-5">{status}</span>
                <small className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{items.length.toLocaleString('fa-IR')} پرونده</small>
              </h3>
              {items.map(person => (
                <Button
                  type="button"
                  key={person.id}
                  onClick={() => onSelect(person)}
                  draggable={canChange}
                  className={cn(
                    'mb-2 flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-right shadow-sm hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20',
                    canChange && 'cursor-grab active:cursor-grabbing',
                  )}
                  title={canChange ? 'برای جابه‌جایی بکشید؛ با انتخاب کارت جزئیات را باز کنید' : 'نمایش جزئیات پرونده'}
                  aria-label={`${person.firstName} ${person.lastName}، ${person.status}؛ نمایش جزئیات پرونده`}
                  onDragStart={event => {
                    if (canChange) {
                      event.dataTransfer.setData('text/person', person.id)
                      event.dataTransfer.effectAllowed = 'move'
                    }
                  }}
                >
                  <Avatar text={person.firstName?.[0] ?? '؟'} src={person.photo} />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm text-slate-800 dark:text-slate-100">{person.firstName} {person.lastName}</b>
                    <small className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{person.id}</small>
                  </span>
                  <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m7 4 6 6-6 6" /></svg>
                </Button>
              ))}
              {!items.length && <div className={cn(emptyBox, 'px-3 py-6 text-xs')}>پرونده‌ای در این مرحله نیست.</div>}
            </section>
          )
        })}
      </div>
    </>
  )
}
