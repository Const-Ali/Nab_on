import { Button } from '../common/Button'
import { useState } from 'react'
import { Avatar, Heading } from '../../shared-ui'
import { workflow, personTags, STALE_LIMIT, deadlineLeft, PAGE_SIZE, staleDays, downloadCsv } from '../../app-lib'
import { formatServerTimestamp, jalaliJdn, jalaliMonthNames, normalizeText, timestampToMs } from '../../shared'
import type { Status, Person, PersonFilter } from '../../types'
import { Badge } from '../common/Badge'
import { cn, emptyBox, panelBox, rowCheck, searchBox, searchInput, selectCls } from '../ui'

const tagToneClasses: Record<string, string> = {
  red: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  purple: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  blue: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
}

export function Persons({
  people,
  query,
  filter,
  tagFilter,
  sortBy,
  selfUsername,
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
  selfUsername: string
  setQuery: (v: string) => void
  setFilter: (v: PersonFilter) => void
  setTagFilter: (v: string) => void
  setSortBy: (v: string) => void
  canCreate: boolean
  canDelete: boolean
  onCreate: () => void
  onSelect: (p: Person) => void
  onBulkStatus: (ids: string[], target: Status) => void
  onBulkDelete: (ids: string[]) => boolean
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pageNo, setPageNo] = useState(0)

  const reset = <A,>(fn: (v: A) => void) => (value: A) => {
    fn(value)
    setPageNo(0)
    setSelectedIds(new Set())
  }

  const normalizedQuery = normalizeText(query).toLocaleLowerCase('fa-IR')
  const filteredPeople = people.filter(person => {
    const fields = [person.id, person.firstName, person.lastName, person.fatherName, person.nationalId, person.birthDate]
    const matchesQuery = !normalizedQuery || fields.some(field => normalizeText(String(field ?? '')).toLocaleLowerCase('fa-IR').includes(normalizedQuery))
    const dueIn = deadlineLeft(person)
    const matchesStatus = filter === 'همه وضعیت‌ها'
      || (filter === 'ارجاع‌شده به من' && person.assignee === selfUsername)
      || (filter === 'سررسید نزدیک' && dueIn !== null && dueIn <= 3)
      || person.status === filter
    const matchesTag = tagFilter === 'همه برچسب‌ها' || (person.tags ?? []).includes(tagFilter)
    return matchesQuery && matchesStatus && matchesTag
  })
  const updateOrder = (person: Person) => {
    const serverTime = timestampToMs(person.ts)
    if (serverTime) return serverTime
    const dateText = normalizeText(String(person.updatedAt ?? '').split(' · ')[0])
    const slashDate = dateText.match(/^(\d{3,4})[/-](\d{1,2})[/-](\d{1,2})$/)
    if (slashDate) {
      const [, yearText, monthText, dayText] = slashDate
      const year = Number(yearText)
      const month = Number(monthText)
      const day = Number(dayText)
      if (year >= 1300 && year <= 1600 && month >= 1 && month <= 12 && day >= 1 && day <= 31) return jalaliJdn(year, month, day) * 86400000
      const date = new Date(year, month - 1, day)
      return Number.isNaN(date.getTime()) ? 0 : date.getTime()
    }
    const namedDate = dateText.match(/^(\d{1,2})\s+(\S+)\s+(\d{3,4})$/)
    if (!namedDate) return 0
    const [, dayText, monthName, yearText] = namedDate
    const monthIndex = jalaliMonthNames.indexOf(monthName)
    return monthIndex < 0 ? 0 : jalaliJdn(Number(yearText), monthIndex + 1, Number(dayText)) * 86400000
  }
  const sortedPeople = [...filteredPeople]
  if (sortBy === 'recent') sortedPeople.sort((a, b) => updateOrder(b) - updateOrder(a))
  else if (sortBy === 'name') sortedPeople.sort((a, b) => a.lastName.localeCompare(b.lastName, 'fa') || a.firstName.localeCompare(b.firstName, 'fa'))
  else if (sortBy === 'status') sortedPeople.sort((a, b) => workflow.indexOf(a.status) - workflow.indexOf(b.status))

  const hasActiveFilters = Boolean(query.trim()) || filter !== 'همه وضعیت‌ها' || tagFilter !== 'همه برچسب‌ها' || sortBy !== 'default'
  const pageCount = Math.max(1, Math.ceil(sortedPeople.length / PAGE_SIZE))
  const safePage = Math.min(pageNo, pageCount - 1)
  const pageItems = sortedPeople.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const toggleId = (id: string) =>
    setSelectedIds(cur => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
        action={canCreate ? <Button variant="primary" onClick={onCreate}> افزودن فرد</Button> : undefined}
      />
      <section className={cn(panelBox, 'overflow-hidden')}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row dark:border-slate-800">
          <div className={searchBox}>
            <input
              type="search"
              value={query}
              onChange={e => reset(setQuery)(e.target.value)}
              className={searchInput}
              placeholder="جست‌وجو بر اساس نام، نام خانوادگی، نام پدر یا کد ملی..."
              aria-label="جست‌وجوی پرونده‌ها"
              autoComplete="off"
            />
          </div>
          <select aria-label="فیلتر بر اساس وضعیت پرونده" className={cn(selectCls, 'mt-0 w-full lg:w-48')} value={filter} onChange={e => reset(setFilter)(e.target.value as PersonFilter)}>
            <option value="همه وضعیت‌ها">همه وضعیت‌ها</option>
            <option value="ارجاع‌شده به من">ارجاع‌شده به من</option>
            <option value="سررسید نزدیک">سررسید نزدیک</option>
            {workflow.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="فیلتر بر اساس برچسب" className={cn(selectCls, 'mt-0 w-full lg:w-40')} value={tagFilter} onChange={e => reset(setTagFilter)(e.target.value)}>
            <option value="همه برچسب‌ها">همه برچسب‌ها</option>
            {Object.keys(personTags).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="مرتب‌سازی پرونده‌ها" className={cn(selectCls, 'mt-0 w-full lg:w-40')} value={sortBy} onChange={e => reset(setSortBy)(e.target.value)}>
            <option value="default">ترتیب پیش‌فرض</option>
            <option value="recent">جدیدترین تغییر</option>
            <option value="name">نام خانوادگی</option>
            <option value="status">مرحله گردش‌کار</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite" aria-atomic="true">
            نمایش {sortedPeople.length.toLocaleString('fa-IR')} از {people.length.toLocaleString('fa-IR')} پرونده
          </span>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="xs" onClick={() => {
              setQuery('')
              setFilter('همه وضعیت‌ها')
              setTagFilter('همه برچسب‌ها')
              setSortBy('default')
              setPageNo(0)
              setSelectedIds(new Set())
            }}>پاک‌کردن جست‌وجو و فیلترها</Button>
          )}
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
            <Button type="button" variant="outline" size="xs" onClick={exportSelected}> خروجی اکسل</Button>
            {canDelete && (
              <Button
                type="button"
                variant="dangerGhost"
                size="xs"
                onClick={() => {
                  if (onBulkDelete([...selectedIds])) setSelectedIds(new Set())
                }}
              >
                 حذف گروهی
              </Button>
            )}
            <Button type="button" variant="outline" size="xs" onClick={() => setSelectedIds(new Set())}> لغو انتخاب</Button>
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
          <div className="grid w-full grid-cols-1 gap-3 border-b border-slate-100 px-4 py-4 text-right hover:bg-slate-50 sm:px-5 lg:grid-cols-[minmax(16rem,1.8fr)_1fr_1fr_1.2fr_1.2fr_1fr] lg:items-center lg:gap-4 dark:border-slate-800 dark:hover:bg-slate-800/50" key={p.id}>
            <span className="flex min-w-0 items-center gap-3">
              <input
                type="checkbox"
                className={rowCheck}
                checked={selectedIds.has(p.id)}
                onChange={() => toggleId(p.id)}
                aria-label={`انتخاب ${p.firstName} ${p.lastName}`}
              />
              <Button
                type="button"
                variant="unstyled"
                size="none"
                className="min-w-0 flex-1 justify-start gap-3 rounded-lg py-1 text-right"
                onClick={() => onSelect(p)}
                aria-label={`نمایش پرونده ${p.firstName} ${p.lastName}`}
                title="نمایش پرونده"
              >
                <Avatar text={p.firstName?.[0] ?? '؟'} src={p.photo} />
                <b className="min-w-0 text-sm text-slate-800 dark:text-slate-100">{p.firstName} {p.lastName}<small className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">{p.id}</small></b>
                {(p.tags ?? []).map(t => <span className={cn('hidden rounded-md px-2 py-1 text-xs font-medium sm:inline-flex', tagToneClasses[personTags[t]] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')} key={t}>{t}</span>)}
              </Button>
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
            <span className="text-sm text-slate-500 dark:text-slate-400"><small className="ml-2 inline lg:hidden">فعالیت:</small>{formatServerTimestamp(p.updatedAt, p.ts)}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400"><small className="ml-2 inline lg:hidden">کاربر:</small>{p.updatedBy}</span>
          </div>
        ))}
        {!sortedPeople.length && (
          <div className={cn(emptyBox, 'm-4')}>
            {people.length === 0 ? (
              <>
                <p>هنوز پرونده‌ای ثبت نشده است.</p>
                {canCreate && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onCreate}>ثبت نخستین پرونده</Button>}
              </>
            ) : (
              <>
                <p>با جست‌وجو یا فیلترهای انتخاب‌شده پرونده‌ای پیدا نشد.</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => {
                  setQuery('')
                  setFilter('همه وضعیت‌ها')
                  setTagFilter('همه برچسب‌ها')
                  setSortBy('default')
                  setPageNo(0)
                  setSelectedIds(new Set())
                }}>پاک‌کردن جست‌وجو و فیلترها</Button>
              </>
            )}
          </div>
        )}
        {sortedPeople.length > PAGE_SIZE && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-slate-800 dark:text-slate-400">
            <span>{sortedPeople.length.toLocaleString('fa-IR')} پروندهٔ منطبق · صفحه {(safePage + 1).toLocaleString('fa-IR')} از {pageCount.toLocaleString('fa-IR')}</span>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" variant="outline" size="xs" disabled={safePage === 0} onClick={() => setPageNo(safePage - 1)}> قبلی</Button>
              {Array.from({ length: pageCount }, (_, i) => i).filter(i => pageCount <= 7 || Math.abs(i - safePage) <= 2 || i === 0 || i === pageCount - 1).map(i => (
                <Button
                  type="button"
                  key={i}
                  variant="tab"
                  size="xs"
                  aria-label={`صفحه ${i + 1}`}
                  aria-current={i === safePage ? 'page' : undefined}
                  className={i === safePage ? 'bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500' : ''}
                  onClick={() => setPageNo(i)}
                >
                  {(i + 1).toLocaleString('fa-IR')}
                </Button>
              ))}
              <Button type="button" variant="outline" size="xs" disabled={safePage >= pageCount - 1} onClick={() => setPageNo(safePage + 1)}> بعدی</Button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
