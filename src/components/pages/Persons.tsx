import { Button } from '../common/Button'
import { useState } from 'react'
import { Avatar, Heading } from '../../shared-ui'
import { personTags, deadlineLeft, staleDays, downloadCsv } from '../../app-lib'
import type { WorkflowConfig, WorkflowStage } from '../../workflow'
import { activeStages, checklistMissing, stageById, stageIdForPerson } from '../../workflow'
import { formatServerTimestamp, jalaliJdn, jalaliMonthNames, load, normalizeText, save, timestampToMs } from '../../shared'
import type { Person, PersonFilter } from '../../types'
import { Badge } from '../common/Badge'
import { cn, emptyBox, panelBox, rowCheck, searchBox, searchInput, selectCls } from '../ui'

const tagToneClasses: Record<string, string> = {
  red: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  purple: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  blue: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
}

const personPageSizes = [20, 50, 100, 200] as const
type PersonPageSize = typeof personPageSizes[number]

export function Persons({
  people,
  workflowConfig,
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
  canChange,
  canDelete,
  canImportExcel,
  canExportExcel,
  canExportCsv,
  onCreate,
  onImportExcel,
  onExportExcel,
  onSelect,
  onBulkStatus,
  onBulkDelete,
}: {
  people: Person[]
  workflowConfig: WorkflowConfig
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
  canChange: boolean
  canDelete: boolean
  canImportExcel: boolean
  canExportExcel: boolean
  canExportCsv: boolean
  onCreate: () => void
  onImportExcel: () => void
  onExportExcel: () => void
  onSelect: (p: Person) => void
  onBulkStatus: (ids: string[], targetStageId: string) => boolean | Promise<boolean>
  onBulkDelete: (ids: string[]) => boolean | Promise<boolean>
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const canSelect = canChange || canDelete || canExportCsv
  const [pageNo, setPageNo] = useState(0)
  const [pageSize, setPageSize] = useState<PersonPageSize>(() => {
    const saved = load<unknown>('nab:persons-page-size', 20)
    return typeof saved === 'number' && personPageSizes.includes(saved as PersonPageSize) ? saved as PersonPageSize : 20
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const workflowStages = activeStages(workflowConfig)
  const selectedPeople = people.filter(person => selectedIds.has(person.id))
  const selectedStageIds = new Set(selectedPeople.map(person => stageIdForPerson(person, workflowConfig)))
  const commonSelectedStage = selectedStageIds.size === 1 ? stageById(workflowConfig, [...selectedStageIds][0]) : undefined
  const bulkOptions = canChange && commonSelectedStage
    ? commonSelectedStage.nextStageIds.map(id => stageById(workflowConfig, id)).filter((stage): stage is WorkflowStage => Boolean(stage && !stage.archived && stage.id !== 'rejected'))
    : []
  const bulkChecklistIncomplete = commonSelectedStage
    ? selectedPeople.filter(person => checklistMissing(commonSelectedStage, person).length > 0).length
    : 0

  const reset = <A,>(fn: (v: A) => void) => (value: A) => {
    fn(value)
    setPageNo(0)
    setSelectedIds(new Set())
  }

  const normalizedQuery = normalizeText(query).toLocaleLowerCase('fa-IR')
  const filteredPeople = people.filter(person => {
    const fields = [person.id, person.firstName, person.lastName, person.fatherName, person.nationalId, person.birthDate]
    const matchesQuery = !normalizedQuery || fields.some(field => normalizeText(String(field ?? '')).toLocaleLowerCase('fa-IR').includes(normalizedQuery))
    const dueIn = deadlineLeft(person, workflowConfig)
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
  else if (sortBy === 'status') sortedPeople.sort((a, b) => workflowStages.findIndex(stage => stage.id === stageIdForPerson(a, workflowConfig)) - workflowStages.findIndex(stage => stage.id === stageIdForPerson(b, workflowConfig)))

  const hasActiveFilters = Boolean(query.trim()) || filter !== 'همه وضعیت‌ها' || tagFilter !== 'همه برچسب‌ها' || sortBy !== 'default'
  const activeFilterCount = Number(filter !== 'همه وضعیت‌ها') + Number(tagFilter !== 'همه برچسب‌ها') + Number(sortBy !== 'default')
  const pageCount = Math.max(1, Math.ceil(sortedPeople.length / pageSize))
  const safePage = Math.min(pageNo, pageCount - 1)
  const pageItems = sortedPeople.slice(safePage * pageSize, safePage * pageSize + pageSize)

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
    if (!canExportCsv) return
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
        action={canCreate || canImportExcel || canExportExcel ? (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            {canExportExcel && <Button type="button" variant="outline" size="sm" onClick={onExportExcel}>دریافت Excel سرور</Button>}
            {canImportExcel && <Button type="button" variant="outline" size="sm" onClick={onImportExcel}>ورود از Excel</Button>}
            {canCreate && <Button type="button" variant="primary" size="sm" onClick={onCreate}>افزودن فرد</Button>}
          </div>
        ) : undefined}
      />
      <section className={cn(panelBox, 'overflow-hidden')}>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:p-4 lg:flex-row lg:items-start lg:p-5 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-2 lg:flex-1">
            <div className={cn(searchBox, 'min-w-0 w-full')}>
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 px-2.5 lg:!hidden"
              aria-expanded={filtersOpen}
              aria-controls="person-filters"
              onClick={() => setFiltersOpen(open => !open)}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 6h16M7 12h10m-7 6h4" strokeLinecap="round" />
                <circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              فیلترها
              {activeFilterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">{activeFilterCount.toLocaleString('fa-IR')}</span>}
            </Button>
          </div>
          <div id="person-filters" className={cn('grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:shrink-0', !filtersOpen && 'hidden lg:grid')}>
            <select aria-label="فیلتر بر اساس وضعیت پرونده" className={cn(selectCls, 'mt-0 w-full lg:w-44')} value={filter} onChange={e => reset(setFilter)(e.target.value as PersonFilter)}>
              <option value="همه وضعیت‌ها">همه وضعیت‌ها</option>
              <option value="ارجاع‌شده به من">ارجاع‌شده به من</option>
              <option value="سررسید نزدیک">سررسید نزدیک</option>
              {workflowStages.map(stage => <option key={stage.id} value={stage.label}>{stage.label}</option>)}
            </select>
            <select aria-label="فیلتر بر اساس برچسب" className={cn(selectCls, 'mt-0 w-full lg:w-36')} value={tagFilter} onChange={e => reset(setTagFilter)(e.target.value)}>
              <option value="همه برچسب‌ها">همه برچسب‌ها</option>
              {Object.keys(personTags).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select aria-label="مرتب‌سازی پرونده‌ها" className={cn(selectCls, 'mt-0 w-full lg:w-36')} value={sortBy} onChange={e => reset(setSortBy)(e.target.value)}>
              <option value="default">ترتیب پیش‌فرض</option>
              <option value="recent">جدیدترین تغییر</option>
              <option value="name">نام خانوادگی</option>
              <option value="status">مرحله گردش‌کار</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite" aria-atomic="true">
              نمایش {sortedPeople.length.toLocaleString('fa-IR')} از {people.length.toLocaleString('fa-IR')} پرونده
            </span>
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              تعداد در هر صفحه
              <select
                className={cn(selectCls, 'mt-0 w-24')}
                value={pageSize}
                aria-label="تعداد پرونده در هر صفحه"
                onChange={event => {
                  const nextSize = Number(event.target.value)
                  if (!personPageSizes.includes(nextSize as PersonPageSize)) return
                  const validatedSize = nextSize as PersonPageSize
                  setPageSize(validatedSize)
                  save('nab:persons-page-size', validatedSize)
                  setPageNo(0)
                  setSelectedIds(new Set())
                }}
              >
                {personPageSizes.map(size => <option key={size} value={size}>{size.toLocaleString('fa-IR')}</option>)}
              </select>
            </label>
          </div>
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
            {bulkOptions.length > 0 && (
              <select className={cn(selectCls, 'mt-0 sm:w-52')}
                defaultValue=""
                disabled={bulkBusy}
                aria-label="انتقال گروهی به مرحلهٔ بعد مجاز"
                onChange={e => {
                  const targetStageId = e.target.value
                  if (!targetStageId || bulkBusy) return
                  const target = e.currentTarget
                  const ids = [...selectedIds]
                  setBulkBusy(true)
                  void Promise.resolve(onBulkStatus(ids, targetStageId)).then(changed => {
                    if (changed) setSelectedIds(new Set())
                    else target.value = ''
                  }).catch(() => { target.value = '' }).finally(() => setBulkBusy(false))
                }}
              >
                <option value="" disabled>انتقال به مرحلهٔ بعد...</option>
                {bulkOptions.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
              </select>
            )}
            {canChange && !bulkOptions.length && <small className="text-xs leading-5 text-slate-500 dark:text-slate-400">برای انتقال گروهی، پرونده‌ها باید در یک مرحلهٔ مشترک و دارای مسیر بعدی باشند.</small>}
            {bulkChecklistIncomplete > 0 && <small className="text-xs leading-5 text-amber-700 dark:text-amber-300">چک‌لیست {bulkChecklistIncomplete.toLocaleString('fa-IR')} پرونده هنوز کامل نیست.</small>}
            {canExportCsv && <Button type="button" variant="outline" size="xs" onClick={exportSelected}>خروجی CSV</Button>}
            {canDelete && (
              <Button
                type="button"
                variant="dangerGhost"
                size="xs"
                loading={bulkBusy}
                loadingText="در حال حذف…"
                disabled={bulkBusy}
                onClick={() => {
                  const ids = [...selectedIds]
                  setBulkBusy(true)
                  void Promise.resolve(onBulkDelete(ids)).then(deleted => {
                    if (deleted) setSelectedIds(new Set())
                  }).finally(() => setBulkBusy(false))
                }}
              >
                 حذف گروهی
              </Button>
            )}
            <Button type="button" variant="outline" size="xs" onClick={() => setSelectedIds(new Set())}> لغو انتخاب</Button>
          </div>
        )}
        <div className="hidden grid-cols-[minmax(16rem,1.8fr)_1fr_1fr_1.2fr_1.2fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 lg:grid dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
          <span>{canSelect && <input type="checkbox" className={rowCheck} checked={allSelected} onChange={toggleAll} aria-label="انتخاب همه" />} فرد</span>
          <span>کد ملی</span>
          <span>تاریخ تولد</span>
          <span>وضعیت پرونده</span>
          <span>آخرین فعالیت</span>
          <span>ثبت‌کننده</span>
        </div>
        {pageItems.map(p => {
          const currentStage = stageById(workflowConfig, stageIdForPerson(p, workflowConfig))
          const daysInStage = staleDays(p, workflowConfig)
          const hasStalledAlert = Boolean(currentStage?.stalledAfterDays && !currentStage.archived && !currentStage.isFinal && daysInStage >= currentStage.stalledAfterDays)
          return (
          <article className="grid w-full grid-cols-2 gap-x-4 gap-y-3 border-b border-slate-100 px-3 py-3 text-right transition-colors hover:bg-slate-50 sm:px-5 sm:py-4 lg:grid-cols-[minmax(16rem,1.8fr)_1fr_1fr_1.2fr_1.2fr_1fr] lg:items-center lg:gap-4 dark:border-slate-800 dark:hover:bg-slate-800/50" key={p.id}>
            <span className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
              {canSelect && <input
                type="checkbox"
                className={rowCheck}
                checked={selectedIds.has(p.id)}
                onChange={() => toggleId(p.id)}
                aria-label={`انتخاب ${p.firstName} ${p.lastName}`}
              />}
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
                <b className="min-w-0 truncate text-sm text-slate-800 dark:text-slate-100">{p.firstName} {p.lastName}<small className="mt-1 block truncate text-xs font-normal text-slate-500 dark:text-slate-400">{p.id}</small></b>
                {(p.tags ?? []).map(t => <span className={cn('hidden rounded-md px-2 py-1 text-xs font-medium sm:inline-flex', tagToneClasses[personTags[t]] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')} key={t}>{t}</span>)}
              </Button>
            </span>
            <span className="min-w-0 text-xs leading-5 text-slate-600 sm:text-sm dark:text-slate-300">
              <small className="block text-[10px] text-slate-500 lg:hidden">کد ملی</small>
              <b className="font-medium tabular-nums" dir="ltr">{p.nationalId}</b>
            </span>
            <span className="min-w-0 text-xs leading-5 text-slate-600 sm:text-sm dark:text-slate-300">
              <small className="block text-[10px] text-slate-500 lg:hidden">تولد</small>
              <b className="font-medium">{p.birthDate}</b>
            </span>
            <span className="col-span-2 flex min-w-0 flex-wrap items-center gap-1.5 lg:col-span-1">
              <Badge status={currentStage?.label ?? p.status} tone={currentStage?.tone} />
              {hasStalledAlert && <i className="inline-flex rounded-md bg-rose-50 px-2 py-1 text-xs font-medium not-italic text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{daysInStage.toLocaleString('fa-IR')} روز توقف</i>}
              {(() => {
                const l = deadlineLeft(p, workflowConfig)
                return l !== null
                  ? <i className={cn('inline-flex rounded-md px-2 py-1 text-xs font-medium not-italic', l < 0 && 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', l >= 0 && l <= 3 && 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', l > 3 && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300')}>{l < 0 ? `${Math.abs(l).toLocaleString('fa-IR')} روز گذشته` : l === 0 ? 'سررسید امروز' : `${l.toLocaleString('fa-IR')} روز مانده`}</i>
                  : null
              })()}
            </span>
            <span className="min-w-0 text-xs leading-5 text-slate-500 sm:text-sm dark:text-slate-400">
              <small className="block text-[10px] text-slate-500 lg:hidden">آخرین فعالیت</small>
              <span className="block truncate">{formatServerTimestamp(p.updatedAt, p.ts)}</span>
            </span>
            <span className="min-w-0 text-xs leading-5 text-slate-500 sm:text-sm dark:text-slate-400">
              <small className="block text-[10px] text-slate-500 lg:hidden">ثبت‌کننده</small>
              <span className="block truncate">{p.updatedBy}</span>
            </span>
          </article>
          )
        })}
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
        {sortedPeople.length > pageSize && (
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
