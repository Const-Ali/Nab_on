import { useState } from 'react'
import { Avatar, Heading, Icon } from '../../shared-ui'
import { workflow, personTags, STALE_LIMIT, deadlineLeft, PAGE_SIZE, staleDays, downloadCsv } from '../../app-lib'
import type { Status, Person, PersonFilter } from '../../types'
import { Badge } from '../common/Badge'

export function Persons({
  people,
  query,
  filter,
  tagFilter,
  sortBy,
  setQuery,
  setFilter,
  setTagFilter,
  setSortBy,
  canCreate,
  canDelete,
  onCreate,
  onSelect,
  onBulkStatus,
  onBulkDelete,
}: {
  people: Person[]
  query: string
  filter: PersonFilter
  tagFilter: string
  sortBy: string
  setQuery: (v: string) => void
  setFilter: (v: PersonFilter) => void
  setTagFilter: (v: string) => void
  setSortBy: (v: string) => void
  canCreate: boolean
  canDelete: boolean
  onCreate: () => void
  onSelect: (p: Person) => void
  onBulkStatus: (ids: string[], target: Status) => void
  onBulkDelete: (ids: string[]) => void
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pageNo, setPageNo] = useState(0)

  const reset = <A,>(fn: (v: A) => void) => (v: A) => {
    fn(v)
    setPageNo(0)
  }

  const toggleId = (id: string) =>
    setSelectedIds(cur => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const pageCount = Math.max(1, Math.ceil(people.length / PAGE_SIZE))
  const safePage = Math.min(pageNo, pageCount - 1)
  const pageItems = people.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const allSelected = pageItems.length > 0 && pageItems.every(p => selectedIds.has(p.id))

  const toggleAll = () =>
    setSelectedIds(cur => {
      const next = new Set(cur)
      if (allSelected) pageItems.forEach(p => next.delete(p.id))
      else pageItems.forEach(p => next.add(p.id))
      return next
    })

  const exportSelected = () => {
    const rows = people.filter(p => selectedIds.has(p.id))
    downloadCsv(
      'selected-people.csv',
      ['شناسه', 'نام', 'نام خانوادگی', 'کد ملی', 'تاریخ تولد', 'نام پدر', 'وضعیت', 'مهلت پیگیری', 'ارجاع به'],
      rows.map(p => [p.id, p.firstName, p.lastName, p.nationalId, p.birthDate, p.fatherName, p.status, p.deadline ?? '', p.assignee ?? '']),
    )
  }

  return (
    <>
      <Heading
        title="افراد"
        subtitle="اطلاعات افراد و وضعیت پرونده‌های آن‌ها را مدیریت کنید."
        action={canCreate ? <button className="primary" onClick={onCreate}><Icon name="plus" /> افزودن فرد</button> : undefined}
      />
      <section className="panel people">
        <div className="toolbar">
          <div className="search">
            <Icon name="search" />
            <input
              value={query}
              onChange={e => reset(setQuery)(e.target.value)}
              placeholder="جست‌وجو بر اساس نام، نام خانوادگی، نام پدر یا کد ملی..."
            />
          </div>
          <select value={filter} onChange={e => reset(setFilter)(e.target.value as PersonFilter)}>
            <option value="همه وضعیت‌ها">همه وضعیت‌ها</option>
            <option value="ارجاع‌شده به من">ارجاع‌شده به من</option>
            <option value="سررسید نزدیک">سررسید نزدیک</option>
            {workflow.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={tagFilter} onChange={e => reset(setTagFilter)(e.target.value)}>
            <option value="همه برچسب‌ها">همه برچسب‌ها</option>
            {Object.keys(personTags).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={sortBy} onChange={e => reset(setSortBy)(e.target.value)}>
            <option value="default">ترتیب پیش‌فرض</option>
            <option value="recent">جدیدترین تغییر</option>
            <option value="name">نام خانوادگی</option>
            <option value="status">مرحله گردش‌کار</option>
          </select>
        </div>
        {selectedIds.size > 0 && (
          <div className="bulk-bar">
            <b>{selectedIds.size.toLocaleString('fa-IR')} پرونده انتخاب شده</b>
            <select
              defaultValue=""
              onChange={e => {
                if (!e.target.value) return
                onBulkStatus([...selectedIds], e.target.value as Status)
                setSelectedIds(new Set())
              }}
            >
              <option value="" disabled>تغییر وضعیت گروهی...</option>
              {workflow.filter(s => s !== 'رد شده').map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" className="mini-btn" onClick={exportSelected}><Icon name="download" /> خروجی اکسل</button>
            {canDelete && (
              <button
                type="button"
                className="mini-btn danger-lite"
                onClick={() => {
                  onBulkDelete([...selectedIds])
                  setSelectedIds(new Set())
                }}
              >
                حذف گروهی
              </button>
            )}
            <button type="button" className="mini-btn" onClick={() => setSelectedIds(new Set())}>لغو انتخاب</button>
          </div>
        )}
        <div className="people-head">
          <span><input type="checkbox" className="row-check" checked={allSelected} onChange={toggleAll} aria-label="انتخاب همه" /> فرد</span>
          <span>کد ملی</span>
          <span>تاریخ تولد</span>
          <span>وضعیت پرونده</span>
          <span>آخرین فعالیت</span>
          <span>ثبت‌کننده</span>
        </div>
        {pageItems.map(p => (
          <div className="person-row" key={p.id} onClick={() => onSelect(p)}>
            <span>
              <input
                type="checkbox"
                className="row-check"
                checked={selectedIds.has(p.id)}
                onClick={e => e.stopPropagation()}
                onChange={() => toggleId(p.id)}
                aria-label={`انتخاب ${p.firstName} ${p.lastName}`}
              />
              <Avatar text={p.firstName[0]} src={p.photo} />
              <b>{p.firstName} {p.lastName}<small>{p.id}</small></b>
              {(p.tags ?? []).map(t => <span className={`tag-chip sm ${personTags[t]}`} key={t}>{t}</span>)}
            </span>
            <span>{p.nationalId}</span>
            <span>{p.birthDate}</span>
            <span className="status-cell">
              <Badge status={p.status} />
              {staleDays(p) >= STALE_LIMIT && <i className="stale-chip">{staleDays(p).toLocaleString('fa-IR')} روز توقف</i>}
              {(() => {
                const l = deadlineLeft(p)
                return l !== null
                  ? <i className={`dl-chip ${l < 0 ? 'over' : l <= 3 ? 'warn' : 'ok'}`}>{l < 0 ? `${Math.abs(l).toLocaleString('fa-IR')} روز گذشته` : l === 0 ? 'سررسید امروز' : `${l.toLocaleString('fa-IR')} روز مانده`}</i>
                  : null
              })()}
            </span>
            <span>{p.updatedAt}</span>
            <span>{p.updatedBy}</span>
          </div>
        ))}
        {!people.length && <div className="empty">نتیجه‌ای پیدا نشد</div>}
        {people.length > PAGE_SIZE && (
          <div className="pager">
            <span>{people.length.toLocaleString('fa-IR')} پرونده · صفحه {(safePage + 1).toLocaleString('fa-IR')} از {pageCount.toLocaleString('fa-IR')}</span>
            <div className="pager-btns">
              <button type="button" className="mini-btn" disabled={safePage === 0} onClick={() => setPageNo(safePage - 1)}>قبلی</button>
              {Array.from({ length: pageCount }, (_, i) => i).filter(i => pageCount <= 7 || Math.abs(i - safePage) <= 2 || i === 0 || i === pageCount - 1).map(i => (
                <button type="button" key={i} className={`mini-btn ${i === safePage ? 'on' : ''}`} onClick={() => setPageNo(i)}>{(i + 1).toLocaleString('fa-IR')}</button>
              ))}
              <button type="button" className="mini-btn" disabled={safePage >= pageCount - 1} onClick={() => setPageNo(safePage + 1)}>بعدی</button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
