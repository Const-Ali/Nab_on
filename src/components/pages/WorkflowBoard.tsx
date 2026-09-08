import { useState } from 'react'
import { Avatar, Heading } from '../../shared-ui'
import { workflow } from '../../app-lib'
import type { Status, Person } from '../../types'

export function WorkflowBoard({ people, canChange, onSelect, onDropPerson }: { people: Person[]; canChange: boolean; onSelect: (p: Person) => void; onDropPerson: (personId: string, target: Status) => void }) {
  const [over, setOver] = useState<Status | null>(null)
  return (
    <>
      <Heading
        title="گردش‌کار پرونده"
        subtitle={canChange ? 'پرونده‌ها را با موس بین مراحل بکشید و رها کنید؛ فقط انتقال‌های مجاز انجام می‌شود.' : 'نمای کلی وضعیت پرونده‌ها در مراحل گردش‌کار.'}
      />
      <div className="workflow">
        {workflow.map((status, i) => (
          <section
            key={status}
            className={over === status ? 'drop-target' : ''}
            onDragOver={e => { if (canChange) { e.preventDefault(); setOver(status) } }}
            onDragLeave={() => setOver(cur => (cur === status ? null : cur))}
            onDrop={e => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/person'); if (id) onDropPerson(id, status) }}
          >
            <h3><b>{(i + 1).toLocaleString('fa-IR')}</b>{status}<small>{people.filter(p => p.status === status).length.toLocaleString('fa-IR')} پرونده</small></h3>
            {people.filter(p => p.status === status).map(p => (
              <button
                type="button"
                key={p.id}
                onClick={() => onSelect(p)}
                draggable={canChange}
                title={canChange ? 'برای جابه‌جایی بکشید یا برای مشاهده جزئیات کلیک کنید' : 'مشاهده جزئیات پرونده'}
                onDragStart={e => {
                  if (canChange) {
                    e.dataTransfer.setData('text/person', p.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }
                }}
              >
                <Avatar text={p.firstName[0]} src={p.photo} />
                <span>
                  <b>{p.firstName} {p.lastName}</b>
                  <small>{p.id}</small>
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}
