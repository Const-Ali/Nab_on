import { useState } from 'react'
import type { DocumentWorkflow } from '../../documents'
import { documentTones } from '../../documents'
import { uid } from '../../shared'
import { Button } from '../common/Button'
import { backdropCls, cn, errorBox, inputCls, modalActions, modalBox, modalH2, modalNote, modalP, modalX, panelBox, selectCls } from '../ui'

const toneLabels: Record<string, string> = {
  blue: 'آبی', indigo: 'نیلی', purple: 'بنفش', amber: 'کهربایی', orange: 'نارنجی',
  green: 'سبز', cyan: 'فیروزه‌ای', red: 'قرمز', pink: 'صورتی', slate: 'خاکستری',
}

export function DocumentWorkflowManager({
  workflow,
  stageUsage,
  onClose,
  onSave,
}: {
  workflow: DocumentWorkflow
  stageUsage: Record<string, number>
  onClose: () => void
  onSave: (workflow: DocumentWorkflow) => Promise<void>
}) {
  const [draft, setDraft] = useState<DocumentWorkflow>(() => structuredClone(workflow))
  const [newLabel, setNewLabel] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const updateStage = (id: string, patch: { label?: string; description?: string; tone?: string }) => {
    setDraft(current => ({
      ...current,
      stages: current.stages.map(stage => stage.id === id ? { ...stage, ...patch } : stage),
    }))
    setError('')
  }

  const moveStage = (id: string, offset: -1 | 1) => {
    setDraft(current => {
      const index = current.stages.findIndex(stage => stage.id === id)
      const target = index + offset
      if (index < 0 || target < 0 || target >= current.stages.length) return current
      const stages = [...current.stages]
      ;[stages[index], stages[target]] = [stages[target], stages[index]]
      return { ...current, stages }
    })
  }

  const addStage = () => {
    const label = newLabel.trim()
    if (!label) {
      setError('نام مرحلهٔ تازه را وارد کنید.')
      return
    }
    if (draft.stages.some(stage => stage.label.trim().toLocaleLowerCase() === label.toLocaleLowerCase())) {
      setError('نام مرحله تکراری است.')
      return
    }
    const stageId = uid('docstage').toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    setDraft(current => ({ ...current, stages: [...current.stages, { id: stageId, label, description: newDescription.trim(), tone: 'slate' }] }))
    setNewLabel('')
    setNewDescription('')
    setError('')
  }

  const removeStage = (id: string) => {
    const stage = draft.stages.find(item => item.id === id)
    if (!stage || draft.stages.length <= 1 || (stageUsage[id] ?? 0) > 0) return
    if (!window.confirm(`مرحلهٔ «${stage.label}» حذف شود؟ این مرحله هیچ مدرکی ندارد.`)) return
    const stages = draft.stages.filter(item => item.id !== id)
    setDraft(current => ({
      ...current,
      stages,
      startStageId: current.startStageId === id ? stages[0].id : current.startStageId,
    }))
    setError('')
  }

  const save = async () => {
    if (draft.stages.length < 1) {
      setError('گردش‌کار باید دست‌کم یک مرحله داشته باشد.')
      return
    }
    if (draft.stages.some(stage => !stage.label.trim())) {
      setError('نام همهٔ مرحله‌ها را تکمیل کنید.')
      return
    }
    const names = draft.stages.map(stage => stage.label.trim().toLocaleLowerCase())
    if (new Set(names).size !== names.length) {
      setError('نام مرحله‌ها باید یکتا باشد.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ ...draft, stages: draft.stages.map(stage => ({ ...stage, label: stage.label.trim(), description: stage.description.trim() })) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیرهٔ مرحله‌های مدارک ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={backdropCls} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className={cn(modalBox, 'max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom))] w-full max-w-4xl')} role="dialog" aria-modal="true" aria-labelledby="document-workflow-title" dir="rtl">
        <Button type="button" className={modalX} onClick={onClose} aria-label="بستن">بستن</Button>
        <small className="block text-xs text-slate-500 dark:text-slate-400">تنظیم مستقل از گردش‌کار پرونده‌های افراد</small>
        <h2 id="document-workflow-title" className={modalH2}>مدیریت مرحله‌های پیگیری مدارک</h2>
        <p className={modalP}>مرحله‌ها را اضافه، ویرایش، مرتب یا حذف کنید و برای هرکدام شرح بنویسید. جابه‌جایی بین مرحله‌ها برای کاربران مجاز دستی است و مسیر پرونده‌های افراد را تغییر نمی‌دهد.</p>

        <div className={cn(modalNote, 'mt-4')}>
          اگر مدرکی در مرحله‌ای باشد، ابتدا مرحلهٔ همان مدرک را عوض کنید؛ سپس آن مرحله قابل حذف می‌شود. این کار جلوی بی‌مرحله ماندن مدارک قبلی را می‌گیرد.
        </div>

        <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
          مرحلهٔ آغازین برای مدارک جدید
          <select className={cn(selectCls, 'mt-1.5')} value={draft.startStageId} onChange={event => setDraft(current => ({ ...current, startStageId: event.target.value }))}>
            {draft.stages.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
          </select>
        </label>

        <div className="mt-4 space-y-2">
          {draft.stages.map((stage, index) => {
            const usage = stageUsage[stage.id] ?? 0
            return (
              <div key={stage.id} className={cn(panelBox, 'grid grid-cols-1 gap-3 p-3 sm:grid-cols-[auto_minmax(0,1fr)_9rem_auto] sm:items-start')}>
                <span className="text-xs font-bold tabular-nums text-slate-400">{(index + 1).toLocaleString('fa-IR')}</span>
                <div className="grid min-w-0 gap-2">
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    نام مرحله
                    <input className={cn(inputCls, 'mt-1')} maxLength={100} value={stage.label} onChange={event => updateStage(stage.id, { label: event.target.value })} />
                  </label>
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    شرح مرحله
                    <textarea className={cn(inputCls, 'mt-1 min-h-20 resize-y')} rows={2} maxLength={1000} value={stage.description} onChange={event => updateStage(stage.id, { description: event.target.value })} placeholder="شرح کوتاه این مرحله برای کاربران…" />
                  </label>
                </div>
                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  رنگ
                  <select className={cn(selectCls, 'mt-1')} value={stage.tone} onChange={event => updateStage(stage.id, { tone: event.target.value })}>
                    {documentTones.map(tone => <option key={tone} value={tone}>{toneLabels[tone]}</option>)}
                  </select>
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="xs" disabled={index === 0} onClick={() => moveStage(stage.id, -1)} title="انتقال به بالا" aria-label={`انتقال ${stage.label} به بالا`}>↑</Button>
                    <Button type="button" variant="outline" size="xs" disabled={index === draft.stages.length - 1} onClick={() => moveStage(stage.id, 1)} title="انتقال به پایین" aria-label={`انتقال ${stage.label} به پایین`}>↓</Button>
                  </div>
                  <small className="whitespace-nowrap text-xs text-slate-500">{usage.toLocaleString('fa-IR')} مدرک</small>
                  <Button type="button" variant="dangerGhost" size="xs" disabled={draft.stages.length <= 1 || usage > 0} title={usage > 0 ? 'ابتدا مدارک این مرحله را به مرحلهٔ دیگری ببرید' : 'حذف مرحله'} onClick={() => removeStage(stage.id)}>حذف</Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input className={inputCls} maxLength={100} value={newLabel} onChange={event => { setNewLabel(event.target.value); setError('') }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addStage() } }} placeholder="نام مرحلهٔ جدید؛ مثلاً برگشت برای اصلاح" />
          <textarea className={cn(inputCls, 'min-h-20 resize-y')} rows={2} maxLength={1000} value={newDescription} onChange={event => { setNewDescription(event.target.value); setError('') }} placeholder="شرح مرحلهٔ جدید (اختیاری)" />
          <div className="flex justify-start sm:col-span-2">
            <Button type="button" variant="outline" onClick={addStage}>افزودن مرحله</Button>
          </div>
        </div>

        {error && <p className={errorBox} role="alert">{error}</p>}
        <div className={modalActions}>
          <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
          <Button type="button" variant="primary" loading={saving} loadingText="در حال ذخیره…" onClick={() => void save()}>ذخیرهٔ گردش‌کار مدارک</Button>
        </div>
      </section>
    </div>
  )
}
