import { useMemo, useState } from 'react'
import { downloadCsv } from '../../app-lib'
import type { DocumentDraft, DocumentRecord, DocumentWorkflow } from '../../documents'
import { blankDocumentDraft, documentDurationDays } from '../../documents'
import { formatServerTimestamp, normalizeText, uid } from '../../shared'
import { Heading } from '../../shared-ui'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import { DocumentFormModal } from '../modals/DocumentFormModal'
import { cn, emptyBox, panelBox, panelPad, searchBox, searchInput, selectCls } from '../ui'

export function Documents({
  documents,
  workflow,
  canCreate,
  canEdit,
  canChangeStage,
  canDelete,
  canExport,
  onSaveDocument,
  onDeleteDocument,
  onToast,
}: {
  documents: DocumentRecord[]
  workflow: DocumentWorkflow
  canCreate: boolean
  canEdit: boolean
  canChangeStage: boolean
  canDelete: boolean
  canExport: boolean
  onSaveDocument: (document: DocumentDraft) => Promise<DocumentRecord>
  onDeleteDocument: (id: string) => Promise<void>
  onToast: (message: string) => void
}) {
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [formDraft, setFormDraft] = useState<DocumentDraft | null>(null)
  const [stageBusyId, setStageBusyId] = useState('')
  const [pageError, setPageError] = useState('')

  const stageUsage = useMemo(() => Object.fromEntries(workflow.stages.map(stage => [stage.id, documents.filter(document => document.stageId === stage.id).length])), [workflow.stages, documents])
  const pendingCount = documents.filter(document => Boolean(document.sentDate) && !document.responseDate).length
  const responded = documents.flatMap(document => {
    const days = documentDurationDays(document)
    return document.responseDate && days !== null ? [days] : []
  })
  const averageDays = responded.length ? Math.round(responded.reduce((sum, days) => sum + days, 0) / responded.length) : null

  const visibleDocuments = useMemo(() => {
    const normalizedQuery = normalizeText(query)
    return documents
      .filter(document => stageFilter === 'all' || document.stageId === stageFilter)
      .filter(document => !normalizedQuery || [document.title, document.topic, document.center, document.referenceNumber, document.centerResponse, document.outcome, document.assignee]
        .some(value => normalizeText(value).includes(normalizedQuery)))
      .sort((left, right) => (right.ts || 0) - (left.ts || 0))
  }, [documents, query, stageFilter])

  const startCreate = () => {
    setPageError('')
    setFormDraft(blankDocumentDraft(workflow.startStageId, uid('DOC')))
  }

  const startEdit = (document: DocumentRecord) => {
    setPageError('')
    setFormDraft({ ...document })
  }

  const saveForm = async (document: DocumentDraft) => {
    const normalizeDuplicateText = (value: string) => normalizeText(value).replace(/\s+/g, ' ').toLocaleLowerCase()
    const normalizeDuplicateDate = (value: string) => {
      const normalized = normalizeText(value)
      const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
      return match ? `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}` : normalized
    }
    const duplicate = document.center.trim() && document.sentDate.trim()
      ? documents.find(existing => existing.id !== document.id
        && normalizeDuplicateText(existing.center) === normalizeDuplicateText(document.center)
        && normalizeDuplicateText(existing.title) === normalizeDuplicateText(document.title)
        && normalizeDuplicateDate(existing.sentDate) === normalizeDuplicateDate(document.sentDate))
      : undefined
    if (duplicate && !window.confirm(`هشدار: مدرکی با همین مرکز، عنوان و تاریخ ارسال قبلاً ثبت شده است (شناسه: ${duplicate.id}). آیا با وجود این شباهت ادامه می‌دهید؟`)) {
      throw new Error('ثبت انجام نشد؛ مدرک مشابه پیدا شد. اطلاعات را بررسی کنید یا با تأیید هشدار ادامه دهید.')
    }
    await onSaveDocument(document)
    setFormDraft(null)
    setPageError('')
    onToast(document.createdAt ? 'تغییرات مدرک روی سرور ذخیره شد.' : 'مدرک روی سرور ثبت شد.')
  }

  const changeStage = async (document: DocumentRecord, stageId: string) => {
    if (stageId === document.stageId) return
    setStageBusyId(document.id)
    setPageError('')
    try {
      await onSaveDocument({ ...document, stageId })
      onToast('مرحلهٔ مدرک تغییر کرد.')
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : 'تغییر مرحلهٔ مدرک ناموفق بود.')
    } finally {
      setStageBusyId('')
    }
  }

  const removeDocument = async (document: DocumentRecord) => {
    if (!canDelete) return
    if (!window.confirm(`مدرک «${document.title}» حذف شود؟ این کار قابل بازگشت نیست.`)) return
    setPageError('')
    try {
      await onDeleteDocument(document.id)
      onToast('مدرک حذف شد.')
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : 'حذف مدرک ناموفق بود.')
    }
  }

  const exportDocuments = () => {
    if (!canExport) return
    downloadCsv('nab-documents.csv', [
      'شناسه', 'نوع/عنوان مدرک', 'موضوع', 'مرکز مقصد', 'شماره پیگیری', 'مرحله',
      'تاریخ ارسال', 'تاریخ پاسخ', 'مدت رسیدگی (روز تقویمی)', 'پاسخ مرکز', 'نتیجه', 'مسئول پیگیری', 'یادداشت',
    ], visibleDocuments.map(document => [
      document.id,
      document.title,
      document.topic,
      document.center,
      document.referenceNumber,
      workflow.stages.find(stage => stage.id === document.stageId)?.label ?? '—',
      document.sentDate,
      document.responseDate,
      documentDurationDays(document) ?? '',
      document.centerResponse,
      document.outcome,
      document.assignee,
      document.notes,
    ]))
    onToast(`${visibleDocuments.length.toLocaleString('fa-IR')} مدرک در فایل CSV آماده شد.`)
  }

  return (
    <>
      <Heading
        title="پیگیری مدارک"
        subtitle="گردش‌کار مستقلی برای ثبت نوع مدرک، موضوع، مرکز مقصد، پاسخ و مدت رسیدگی؛ هیچ وابستگی به پرونده‌های افراد ندارد."
        action={<div className="flex flex-wrap gap-2">
          {canExport && <Button type="button" variant="outline" onClick={exportDocuments}>خروجی CSV</Button>}
          {canCreate && <Button type="button" variant="primary" onClick={startCreate}>ثبت مدرک جدید</Button>}
        </div>}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className={cn(panelBox, panelPad)}>
          <small className="text-xs text-slate-500 dark:text-slate-400">کل مدارک</small>
          <b className="mt-2 block text-2xl font-bold">{documents.length.toLocaleString('fa-IR')}</b>
        </article>
        <article className={cn(panelBox, panelPad)}>
          <small className="text-xs text-slate-500 dark:text-slate-400">ارسال‌شده و در انتظار پاسخ</small>
          <b className="mt-2 block text-2xl font-bold text-amber-700 dark:text-amber-300">{pendingCount.toLocaleString('fa-IR')}</b>
        </article>
        <article className={cn(panelBox, panelPad)}>
          <small className="text-xs text-slate-500 dark:text-slate-400">میانگین زمان تا پاسخ</small>
          <b className="mt-2 block text-2xl font-bold text-indigo-700 dark:text-indigo-300">{averageDays === null ? '—' : `${averageDays.toLocaleString('fa-IR')} روز`}</b>
          <small className="mt-1 block text-xs text-slate-500">فقط مدارکی که تاریخ ارسال و پاسخ دارند</small>
        </article>
      </div>

      <section className={cn(panelBox, 'mb-4 p-3 sm:p-4')}>
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className={cn(searchBox, 'min-w-0 flex-1')}>
            <span className="text-slate-400" aria-hidden="true">⌕</span>
            <input className={searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder="جستجو در عنوان، موضوع، مرکز و شماره پیگیری" aria-label="جستجوی مدارک" />
          </label>
          <select className={cn(selectCls, 'lg:max-w-xs')} value={stageFilter} onChange={event => setStageFilter(event.target.value)} aria-label="فیلتر مرحلهٔ مدارک">
            <option value="all">همهٔ مرحله‌ها · {documents.length.toLocaleString('fa-IR')}</option>
            {workflow.stages.map(stage => <option key={stage.id} value={stage.id}>{stage.label} · {(stageUsage[stage.id] ?? 0).toLocaleString('fa-IR')}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition', stageFilter === 'all' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')} onClick={() => setStageFilter('all')}>همه · {documents.length.toLocaleString('fa-IR')}</button>
          {workflow.stages.map(stage => (
            <button key={stage.id} type="button" className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition', stageFilter === stage.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')} onClick={() => setStageFilter(stage.id)}>
              {stage.label} · {(stageUsage[stage.id] ?? 0).toLocaleString('fa-IR')}
            </button>
          ))}
        </div>
      </section>

      {pageError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300" role="alert">{pageError}</div>}

      <section className="space-y-3">
        {visibleDocuments.map(document => {
          const stage = workflow.stages.find(item => item.id === document.stageId)
          const duration = documentDurationDays(document)
          const responsePending = Boolean(document.sentDate) && !document.responseDate
          return (
            <article key={document.id} className={cn(panelBox, 'overflow-hidden')}>
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:px-5 dark:border-slate-800">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-base font-bold text-slate-900 dark:text-slate-100">{document.title}</h2>
                    {stage && <Badge status={stage.label} tone={stage.tone} />}
                  </div>
                  {stage?.description && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-indigo-700 dark:text-indigo-300">شرح مرحله: {stage.description}</p>}
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{document.topic}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">شناسه: {document.id}{document.referenceNumber ? ` · شماره پیگیری: ${document.referenceNumber}` : ''}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canChangeStage && <label className="sr-only" htmlFor={`document-stage-${document.id}`}>تغییر مرحلهٔ {document.title}</label>}
                  {canChangeStage && <select id={`document-stage-${document.id}`} className={cn(selectCls, 'min-w-40 py-2 text-xs')} value={document.stageId} disabled={stageBusyId === document.id} onChange={event => void changeStage(document, event.target.value)}>
                    {workflow.stages.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>}
                  {canEdit && <Button type="button" variant="outline" size="xs" onClick={() => startEdit(document)}>ویرایش</Button>}
                  {canDelete && <Button type="button" variant="dangerGhost" size="xs" onClick={() => void removeDocument(document)}>حذف</Button>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
                <div><small className="block text-xs text-slate-500">مرکز مقصد</small><b className="mt-1 block break-words text-sm">{document.center || '—'}</b></div>
                <div><small className="block text-xs text-slate-500">تاریخ ارسال</small><b className="mt-1 block text-sm">{document.sentDate || 'هنوز ارسال نشده'}</b></div>
                <div><small className="block text-xs text-slate-500">تاریخ پاسخ</small><b className="mt-1 block text-sm">{document.responseDate || 'پاسخی ثبت نشده'}</b></div>
                <div><small className="block text-xs text-slate-500">مدت رسیدگی · تقویمی</small><b className={cn('mt-1 block text-sm', responsePending && 'text-amber-700 dark:text-amber-300')}>
                  {duration === null ? '—' : responsePending ? `${duration.toLocaleString('fa-IR')} روز · در جریان` : `${duration.toLocaleString('fa-IR')} روز تا پاسخ`}
                </b></div>
              </div>

              {(document.centerResponse || document.outcome || document.assignee || document.notes) && <div className="space-y-3 border-t border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-800">
                {document.centerResponse && <div><small className="block text-xs font-semibold text-slate-500 dark:text-slate-400">پاسخ مرکز</small><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{document.centerResponse}</p></div>}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                  {document.outcome && <span><b className="text-slate-700 dark:text-slate-200">نتیجه:</b> {document.outcome}</span>}
                  {document.assignee && <span><b className="text-slate-700 dark:text-slate-200">مسئول پیگیری:</b> {document.assignee}</span>}
                  {document.notes && <span className="whitespace-pre-wrap break-words"><b className="text-slate-700 dark:text-slate-200">یادداشت:</b> {document.notes}</span>}
                </div>
              </div>}

              {document.history.length > 0 && <details className="border-t border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">تاریخچهٔ پیگیری ({document.history.length.toLocaleString('fa-IR')})</summary>
                <ol className="mt-3 space-y-2 border-r border-slate-200 pr-3 dark:border-slate-700">
                  {document.history.slice().reverse().map(event => <li key={event.id} className="relative pr-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    <span className="absolute -right-[1.02rem] top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
                    <b>{event.message}</b><small className="mt-0.5 block text-slate-500">{event.createdBy} · {formatServerTimestamp(event.createdAt, event.ts)}</small>
                  </li>)}
                </ol>
              </details>}
              <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400 dark:border-slate-800 sm:px-5">
                <span>ثبت‌کننده: {document.createdByName || document.createdBy || '—'}</span>
                <span>آخرین ویرایش: {formatServerTimestamp(document.updatedAt, document.ts)}{document.updatedBy ? ` · ${document.updatedBy}` : ''}</span>
              </div>
            </article>
          )
        })}
        {!visibleDocuments.length && <div className={emptyBox}>{documents.length ? 'مدرکی با این جستجو یا مرحله پیدا نشد.' : canCreate ? 'هنوز مدرکی ثبت نشده است؛ با «ثبت مدرک جدید» شروع کنید.' : 'هنوز مدرکی برای نمایش وجود ندارد.'}</div>}
      </section>

      {formDraft && <DocumentFormModal
        initial={formDraft}
        isNew={!formDraft.createdAt}
        workflow={workflow}
        canChangeStage={canChangeStage}
        onClose={() => setFormDraft(null)}
        onSave={saveForm}
      />}
    </>
  )
}
