import { useState } from 'react'
import type { FormEvent } from 'react'
import type { DocumentDraft, DocumentWorkflow } from '../../documents'
import { documentDurationDays } from '../../documents'
import { validDeadlineDate } from '../../app-lib'
import { normalizeDigits } from '../../shared'
import { BirthDateField } from '../../shared-ui'
import { Button } from '../common/Button'
import { backdropCls, cn, errorBox, formGrid, inputCls, labelCls, modalActions, modalBox, modalFormLayout, modalH2, modalP, modalSmall, modalX, selectCls, textareaCls } from '../ui'

export function DocumentFormModal({
  initial,
  isNew,
  workflow,
  canChangeStage,
  onClose,
  onSave,
}: {
  initial: DocumentDraft
  isNew: boolean
  workflow: DocumentWorkflow
  canChangeStage: boolean
  onClose: () => void
  onSave: (document: DocumentDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<DocumentDraft>(() => ({ ...initial }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (patch: Partial<DocumentDraft>) => {
    setDraft(current => ({ ...current, ...patch }))
    setError('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const next = {
      ...draft,
      title: draft.title.trim(),
      topic: draft.topic.trim(),
      center: draft.center.trim(),
      referenceNumber: draft.referenceNumber.trim(),
      sentDate: normalizeDigits(draft.sentDate.trim()),
      responseDate: normalizeDigits(draft.responseDate.trim()),
      centerResponse: draft.centerResponse.trim(),
      outcome: draft.outcome.trim(),
      assignee: draft.assignee.trim(),
      notes: draft.notes.trim(),
    }
    if (!next.title || !next.topic) {
      setError('نوع/عنوان مدرک و موضوع آن را وارد کنید.')
      return
    }
    if (next.sentDate && !validDeadlineDate(next.sentDate)) {
      setError('تاریخ ارسال شمسی معتبر نیست. مثال: ۱۴۰۵/۰۷/۱۵')
      return
    }
    if (next.responseDate && !validDeadlineDate(next.responseDate)) {
      setError('تاریخ پاسخ شمسی معتبر نیست. مثال: ۱۴۰۵/۰۷/۱۵')
      return
    }
    if (next.sentDate && next.responseDate) {
      const days = documentDurationDays({ sentDate: next.sentDate, responseDate: next.responseDate })
      if (days === null) {
        setError('تاریخ پاسخ نمی‌تواند پیش از تاریخ ارسال باشد.')
        return
      }
    }

    setSaving(true)
    setError('')
    try {
      await onSave(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیرهٔ مدرک روی سرور ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  const startStage = workflow.stages.find(stage => stage.id === workflow.startStageId) ?? workflow.stages[0]
  const selectedStage = workflow.stages.find(stage => stage.id === draft.stageId)

  return (
    <div className={backdropCls} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <form className={cn(modalBox, modalFormLayout, 'max-w-4xl')} onSubmit={event => void submit(event)}>
        <Button type="button" className={modalX} onClick={onClose} aria-label="بستن">بستن</Button>
        <small className={modalSmall}>ثبت و پیگیری مستقل؛ بدون اتصال به پروندهٔ افراد</small>
        <h2 className={modalH2}>{isNew ? 'ثبت مدرک برای پیگیری' : 'ویرایش اطلاعات مدرک'}</h2>
        <p className={modalP}>اطلاعات مدرک، موضوع، مرکز مقصد، تاریخ‌ها و پاسخ مرکز را ثبت کنید. مدت رسیدگی از تاریخ ارسال تا پاسخ، بر اساس روز تقویمی محاسبه می‌شود.</p>

        <div className={formGrid}>
          <label className={labelCls}>نوع یا عنوان مدرک *<input className={inputCls} maxLength={160} required value={draft.title} onChange={event => update({ title: event.target.value })} placeholder="مثلاً گواهی اشتغال، حکم یا نامه" /></label>
          <label className={labelCls}>موضوع / علت ارسال *<input className={inputCls} maxLength={500} required value={draft.topic} onChange={event => update({ topic: event.target.value })} placeholder="برای چه موضوعی ارسال شده است؟" /></label>
          <label className={labelCls}>مرکز مقصد<input className={inputCls} maxLength={160} value={draft.center} onChange={event => update({ center: event.target.value })} placeholder="نام مرکز یا اداره" /></label>
          <label className={labelCls}>شماره نامه یا پیگیری<input className={inputCls} maxLength={100} value={draft.referenceNumber} onChange={event => update({ referenceNumber: event.target.value })} placeholder="اختیاری" /></label>
          <label className={labelCls}>تاریخ ارسال به مرکز<BirthDateField value={draft.sentDate} onChange={value => update({ sentDate: value })} placeholder="۱۴۰۵/۰۷/۱۵" /></label>
          <label className={labelCls}>تاریخ دریافت پاسخ<BirthDateField value={draft.responseDate} onChange={value => update({ responseDate: value })} placeholder="۱۴۰۵/۰۷/۲۰" /></label>
          <label className={labelCls}>نتیجهٔ پاسخ مرکز<input className={inputCls} maxLength={1000} value={draft.outcome} onChange={event => update({ outcome: event.target.value })} placeholder="مثلاً تأیید، رد، نیاز به اصلاح" /></label>
          <label className={labelCls}>مسئول پیگیری<input className={inputCls} maxLength={160} value={draft.assignee} onChange={event => update({ assignee: event.target.value })} placeholder="نام مسئول پیگیری (اختیاری)" /></label>
          <label className={cn(labelCls, 'sm:col-span-2')}>متن پاسخ مرکز<textarea className={textareaCls} maxLength={4000} value={draft.centerResponse} onChange={event => update({ centerResponse: event.target.value })} placeholder="متن یا خلاصهٔ پاسخ مرکز را ثبت کنید…" /></label>
          <label className={cn(labelCls, 'sm:col-span-2')}>یادداشت داخلی<textarea className={textareaCls} maxLength={4000} value={draft.notes} onChange={event => update({ notes: event.target.value })} placeholder="توضیحات تکمیلی برای پیگیری" /></label>
          <label className={cn(labelCls, 'sm:col-span-2')}>مرحلهٔ پیگیری
            <select className={selectCls} value={draft.stageId} disabled={!canChangeStage} onChange={event => update({ stageId: event.target.value })}>
              {workflow.stages.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
            {selectedStage?.description && <small className="mt-1 block whitespace-pre-wrap text-xs font-normal leading-5 text-indigo-700 dark:text-indigo-300">شرح مرحله: {selectedStage.description}</small>}
            {!canChangeStage && <small className="mt-1 block text-xs font-normal text-slate-500">مرحلهٔ آغازین: {startStage?.label ?? '—'}؛ برای تغییر مرحله مجوز جداگانه لازم است.</small>}
          </label>
        </div>

        {error && <p className={errorBox} role="alert">{error}</p>}
        <div className={modalActions}>
          <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
          <Button type="submit" variant="primary" loading={saving} loadingText="در حال ذخیره روی سرور…">{isNew ? 'ثبت مدرک' : 'ذخیرهٔ تغییرات'}</Button>
        </div>
      </form>
    </div>
  )
}
