import { useState } from 'react'
import { Avatar, Heading } from '../../shared-ui'
import { workflow, personTags, STALE_LIMIT, deadlineLeft, PAGE_SIZE, staleDays, downloadCsv } from '../../app-lib'
import type { Status, Person, PersonFilter } from '../../types'
import { Badge } from '../common/Badge'
import { btnMini, btnMiniOn, btnPrimary, cn, dangerLiteTxt, emptyBox, panelBox, rowCheck, searchBox, searchInput, selectCls } from '../ui'

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
        action={canCreate ? <button className={btnPrimary} onClick={onCreate}> افزودن فرد</button> : undefined}
      />
      <section className={cn(panelBox, 'overflow-hidden')}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row dark:border-slate-800">
          <div className={searchBox}>
            <input
              value={query}
              onChange={e => reset(setQuery)(e.target.value)}
              className={searchInput}
              placeholder="جست‌وجو بر اساس نام، نام خانوادگی، نام پدر یا کد ملی..."
            />
          </div>
          <select className={cn(selectCls, 'mt-0 w-full lg:w-48')} value={filter} onChange={e => reset(setFilter)(e.target.value as PersonFilter)}>
            <option value="همه وضعیت‌ها">همه وضعیت‌ها</option>
            <option value="ارجاع‌شده به من">ارجاع‌شده به من</option>
            <option value="سررسید نزدیک">سررسید نزدیک</option>
            {workflow.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={cn(selectCls, 'mt-0 w-full lg:w-40')} value={tagFilter} onChange={e => reset(setTagFilter)(e.target.value)}>
            <option value="همه برچسب‌ها">همه برچسب‌ها</option>
            {Object.keys(personTags).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={cn(selectCls, 'mt-0 w-full lg:w-40')} value={sortBy} onChange={e => reset(setSortBy)(e.target.value)}>
            <option value="default">ترتیب پیش‌فرض</option>
            <option value="recent">جدیدترین تغییر</option>
            <option value="name">نام خانوادگی</option>
            <option value="status">مرحله گردش‌کار</option>
          </select>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex flex-col gap-3 border-b border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center dark:border-indigo-900/60 dark:bg-indigo-950/30">
            <b className="text-sm text-indigo-800 dark:text-indigo-200">{selectedIds.size.toLocaleString('fa-IR')} پرونده انتخاب شده</b>
            <select className={cn(selectCls, 'mt-0 sm:w-52')}
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
            <button type="button" className={btnMini} onClick={exportSelected}> خروجی اکسل</button>
            {canDelete && (
              <button
                type="button"
                className={cn(btnMini, dangerLiteTxt)}
                onClick={() => {
                  onBulkDelete([...selectedIds])
                  setSelectedIds(new Set())
                }}
              >
                 حذف گروهی
              </button>
            )}
            <button type="button" className={btnMini} onClick={() => setSelectedIds(new Set())}> لغو انتخاب</button>
          </div>
        )}
        <div className="hidden grid-cols-[minmax(16rem,1.8fr)_1fr_1fr_1.2fr_1.2fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 lg:grid dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
          <span><input type="checkbox" className={rowCheck} checked={allSelected} onChange={toggleAll} aria-label="انتخاب همه" /> فرد</span>
          <span>کد ملی</span>
          <span>تاریخ تولد</span>
          <span>وضعیت پرونده</span>
          <span>آخرین فعالیت</span>
          <span>ثبت‌کننده</span>
        </div>
        {pageItems.map(p => (
          <button type="button" className="grid w-full grid-cols-1 gap-3 border-b border-slate-100 px-4 py-4 text-right hover:bg-slate-50 sm:px-5 lg:grid-cols-[minmax(16rem,1.8fr)_1fr_1fr_1.2fr_1.2fr_1fr] lg:items-center lg:gap-4 dark:border-slate-800 dark:hover:bg-slate-800/50" key={p.id} onClick={() => onSelect(p)}>
            <span className="flex min-w-0 items-center gap-3">
              <input
                type="checkbox"
                className={rowCheck}
                checked={selectedIds.has(p.id)}
                onClick={e => e.stopPropagation()}
                onChange={() => toggleId(p.id)}
                aria-label={`انتخاب ${p.firstName} ${p.lastName}`}
              />
              <Avatar text={p.firstName[0]} src={p.photo} />
              <b className="min-w-0 text-sm text-slate-800 dark:text-slate-100">{p.firstName} {p.lastName}<small className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">{p.id}</small></b>
              {(p.tags ?? []).map(t => <span className={cn('hidden rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 sm:inline-flex dark:bg-slate-800 dark:text-slate-300', personTags[t])} key={t}>{t}</span>)}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-300"><small className="ml-2 inline lg:hidden">کد ملی:</small>{p.nationalId}</span>
            <span className="text-sm text-slate-600 dark:text-slate-300"><small className="ml-2 inline lg:hidden">تولد:</small>{p.birthDate}</span>
            <span className="flex flex-wrap gap-1.5">
              <Badge status={p.status} />
              {staleDays(p) >= STALE_LIMIT && <i className="inline-flex rounded-md bg-rose-50 px-2 py-1 text-xs font-medium not-italic text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{staleDays(p).toLocaleString('fa-IR')} روز توقف</i>}
              {(() => {
                const l = deadlineLeft(p)
                return l !== null
                  ? <i className={cn('inline-flex rounded-md px-2 py-1 text-xs font-medium not-italic', l < 0 && 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', l >= 0 && l <= 3 && 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', l > 3 && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300')}>{l < 0 ? `${Math.abs(l).toLocaleString('fa-IR')} روز گذشته` : l === 0 ? 'سررسید امروز' : `${l.toLocaleString('fa-IR')} روز مانده`}</i>
                  : null
              })()}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400"><small className="ml-2 inline lg:hidden">فعالیت:</small>{p.updatedAt}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400"><small className="ml-2 inline lg:hidden">کاربر:</small>{p.updatedBy}</span>
          </button>
        ))}
        {!people.length && <div className={cn(emptyBox, 'm-4')}>نتیجه‌ای پیدا نشد</div>}
        {people.length > PAGE_SIZE && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-slate-800 dark:text-slate-400">
            <span>{people.length.toLocaleString('fa-IR')} پرونده · صفحه {(safePage + 1).toLocaleString('fa-IR')} از {pageCount.toLocaleString('fa-IR')}</span>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={btnMini} disabled={safePage === 0} onClick={() => setPageNo(safePage - 1)}> قبلی</button>
              {Array.from({ length: pageCount }, (_, i) => i).filter(i => pageCount <= 7 || Math.abs(i - safePage) <= 2 || i === 0 || i === pageCount - 1).map(i => (
                <button type="button" key={i} className={cn(btnMini, i === safePage && btnMiniOn)} onClick={() => setPageNo(i)}>{(i + 1).toLocaleString('fa-IR')}</button>
              ))}
              <button type="button" className={btnMini} disabled={safePage >= pageCount - 1} onClick={() => setPageNo(safePage + 1)}> بعدی</button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
