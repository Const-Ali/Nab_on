import { useState } from 'react'
import { Button } from '../common/Button'
import { uid } from '../../shared'
import type { WorkflowConfig, WorkflowStage } from '../../workflow'
import { allowedWorkflowTones, archiveStage, insertStageAfter } from '../../workflow'
import { backdropCls, cn, inputCls, modalBox, selectCls } from '../ui'

const toneLabels: Record<string, string> = {
  blue: 'آبی', indigo: 'نیلی', purple: 'بنفش', amber: 'کهربایی', orange: 'نارنجی',
  green: 'سبز', cyan: 'فیروزه‌ای', red: 'قرمز', pink: 'صورتی', slate: 'خاکستری',
}

export function WorkflowManager({ config, onClose, onSave }: {
  config: WorkflowConfig
  onClose: () => void
  onSave: (config: WorkflowConfig) => Promise<void>
}) {
  const [draft, setDraft] = useState<WorkflowConfig>(() => structuredClone(config))
  const [newStageLabel, setNewStageLabel] = useState('')
  const [insertAfterId, setInsertAfterId] = useState(config.startStageId)
  const [newTone, setNewTone] = useState('blue')
  const [newChecklist, setNewChecklist] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateStage = (id: string, patch: Partial<WorkflowStage>) => {
    setDraft(current => ({ ...current, stages: current.stages.map(stage => stage.id === id ? { ...stage, ...patch } : stage) }))
  }
  const updateChecklistLabel = (stageId: string, itemId: string, label: string) => {
    setDraft(current => ({
      ...current,
      stages: current.stages.map(stage => stage.id === stageId
        ? { ...stage, checklist: stage.checklist.map(item => item.id === itemId ? { ...item, label } : item) }
        : stage),
    }))
  }
  const removeChecklistItem = (stageId: string, itemId: string) => {
    setDraft(current => ({
      ...current,
      stages: current.stages.map(stage => stage.id === stageId
        ? { ...stage, checklist: stage.checklist.filter(item => item.id !== itemId) }
        : stage),
    }))
  }
  const addChecklistItem = (stageId: string) => {
    const label = (newChecklist[stageId] ?? '').trim()
    if (!label) return
    if (label.length > 200) { setError('عنوان هر مورد چک‌لیست حداکثر ۲۰۰ نویسه است.'); return }
    const id = uid('check').toLowerCase()
    setDraft(current => ({
      ...current,
      stages: current.stages.map(stage => stage.id === stageId
        ? { ...stage, checklist: [...stage.checklist, { id, label }] }
        : stage),
    }))
    setNewChecklist(current => ({ ...current, [stageId]: '' }))
    setError('')
  }
  const addStage = () => {
    const label = newStageLabel.trim()
    if (!label) { setError('عنوان مرحلهٔ جدید را وارد کنید.'); return }
    if (label.length > 100) { setError('عنوان هر مرحله حداکثر ۱۰۰ نویسه است.'); return }
    const id = uid('stage').toLowerCase()
    try {
      setDraft(current => insertStageAfter(current, insertAfterId, {
        id,
        label,
        tone: newTone,
        nextStageIds: [],
        checklist: [],
        stalledAfterDays: null,
      }))
      setNewStageLabel('')
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'افزودن مرحله انجام نشد.')
    }
  }
  const archive = (stage: WorkflowStage) => {
    if (stage.id === draft.startStageId) { setError('مرحلهٔ آغازین قابل بایگانی نیست.'); return }
    if (!window.confirm(`مرحلهٔ «${stage.label}» بایگانی شود؟ پرونده‌ها و سابقه حفظ می‌شوند و مسیرهای ورودی به مرحلهٔ بعدی موجود وصل خواهند شد.`)) return
    try {
      setDraft(current => archiveStage(current, stage.id))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'بایگانی مرحله انجام نشد.')
    }
  }
  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیرهٔ گردش‌کار انجام نشد.')
    } finally {
      setSaving(false)
    }
  }

  const active = draft.stages.filter(stage => !stage.archived)

  return (
    <div className={backdropCls} onClick={event => { if (event.target === event.currentTarget && !saving) onClose() }}>
      <section className={cn(modalBox, 'mobile-fill-modal flex max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom))] w-full max-w-5xl flex-col overflow-hidden p-0 sm:max-h-[calc(100vh-2rem)]')} role="dialog" aria-modal="true" aria-labelledby="workflow-manager-title">
        <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 id="workflow-manager-title" className="text-lg font-bold text-slate-950 dark:text-white">مدیریت گردش‌کار</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              عنوان مرحله‌ها و چک‌لیست دستی را مدیریت کنید. مسیرهای فعلی قابل ویرایش نیستند؛ مرحلهٔ تازه بعد از مرحلهٔ انتخابی قرار می‌گیرد و بایگانی مسیرها را بدون حذف پرونده‌ها دوباره متصل می‌کند.
            </p>
          </div>
          <Button type="button" variant="ghost" size="xs" onClick={onClose} disabled={saving} aria-label="بستن">بستن</Button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/30">
            <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-100">افزودن مرحله</h3>
            <p className="mt-1 text-xs leading-5 text-indigo-800 dark:text-indigo-200">مرحلهٔ جدید پس از مرحلهٔ انتخابی درج می‌شود و مسیر بعدی موجود به آن منتقل خواهد شد.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_10rem_auto]">
              <input className={inputCls} value={newStageLabel} maxLength={100} onChange={event => setNewStageLabel(event.target.value)} placeholder="عنوان مرحلهٔ جدید" aria-label="عنوان مرحلهٔ جدید" />
              <select className={cn(selectCls, 'mt-0')} value={insertAfterId} onChange={event => setInsertAfterId(event.target.value)} aria-label="درج مرحله بعد از">
                {active.map(stage => <option value={stage.id} key={stage.id}>بعد از: {stage.label}</option>)}
              </select>
              <select className={cn(selectCls, 'mt-0')} value={newTone} onChange={event => setNewTone(event.target.value)} aria-label="رنگ مرحلهٔ جدید">
                {allowedWorkflowTones.map(tone => <option value={tone} key={tone}>{toneLabels[tone]}</option>)}
              </select>
              <Button type="button" variant="outline" onClick={addStage}>افزودن</Button>
            </div>
          </section>

          <div className="space-y-3">
            {draft.stages.map((stage, index) => (
              <article key={stage.id} className={cn('rounded-2xl border p-4', stage.archived ? 'border-dashed border-slate-300 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50')}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{(index + 1).toLocaleString('fa-IR')}</span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_12rem]">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">عنوان مرحله
                        <input className={inputCls} value={stage.label} maxLength={100} disabled={saving} onChange={event => updateStage(stage.id, { label: event.target.value })} />
                      </label>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">رنگ برچسب
                        <select className={cn(selectCls, 'mt-1')} value={stage.tone} disabled={saving} onChange={event => updateStage(stage.id, { tone: event.target.value })}>
                          {allowedWorkflowTones.map(tone => <option value={tone} key={tone}>{toneLabels[tone]}</option>)}
                        </select>
                      </label>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">هشدار توقف پس از (روز)
                        <input className={inputCls} type="number" min={1} max={3650} step={1} inputMode="numeric" placeholder="خاموش" value={stage.stalledAfterDays ?? ''} disabled={saving || Boolean(stage.archived)} onChange={event => updateStage(stage.id, { stalledAfterDays: event.target.value === '' ? null : Number(event.target.value) })} />
                        <small className="mt-1 block text-[10px] leading-4 text-slate-400">خالی بماند: هشدار این مرحله خاموش است.</small>
                      </label>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <b className="text-sm text-slate-800 dark:text-slate-100">چک‌لیست دستی · {stage.checklist.length.toLocaleString('fa-IR')} مورد ضروری</b>
                        <small className="text-xs text-slate-500 dark:text-slate-400">انتقال تا تکمیل همهٔ موارد مسدود است</small>
                      </div>
                      {stage.checklist.length > 0 && <div className="space-y-2">
                        {stage.checklist.map((item, itemIndex) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <span className="w-6 shrink-0 text-center text-xs text-slate-400">{(itemIndex + 1).toLocaleString('fa-IR')}</span>
                            <input className={cn(inputCls, 'mt-0 min-w-0 flex-1')} value={item.label} maxLength={200} disabled={saving || Boolean(stage.archived)} onChange={event => updateChecklistLabel(stage.id, item.id, event.target.value)} aria-label={`عنوان مورد چک‌لیست ${itemIndex + 1}`} />
                            <Button type="button" variant="dangerGhost" size="xs" disabled={saving || Boolean(stage.archived)} onClick={() => removeChecklistItem(stage.id, item.id)} title="حذف مورد چک‌لیست">حذف</Button>
                          </div>
                        ))}
                      </div>}
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input className={cn(inputCls, 'mt-0 flex-1')} value={newChecklist[stage.id] ?? ''} maxLength={200} disabled={saving || Boolean(stage.archived) || stage.checklist.length >= 50} onChange={event => setNewChecklist(current => ({ ...current, [stage.id]: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addChecklistItem(stage.id) } }} placeholder="افزودن مورد ضروری به چک‌لیست" aria-label={`افزودن مورد چک‌لیست برای ${stage.label}`} />
                        <Button type="button" variant="outline" size="sm" disabled={saving || Boolean(stage.archived) || !newChecklist[stage.id]?.trim() || stage.checklist.length >= 50} onClick={() => addChecklistItem(stage.id)}>افزودن مورد</Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {stage.id === draft.startStageId && <span className="rounded-md bg-indigo-50 px-2 py-1 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">مرحلهٔ آغازین</span>}
                      {stage.isFinal && <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">مرحلهٔ پایانی</span>}
                      <span>{stage.archived ? 'بایگانی‌شده؛ پرونده‌های موجود قابل مشاهده می‌مانند.' : `${stage.nextStageIds.length.toLocaleString('fa-IR')} مسیر بعدی`}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 md:flex-col">
                    {!stage.archived && stage.id !== draft.startStageId && <Button type="button" variant="dangerGhost" size="xs" disabled={saving} onClick={() => archive(stage)}>بایگانی</Button>}

                  </div>
                </div>
              </article>
            ))}
          </div>

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200" role="alert">{error}</div>}
        </div>

        <footer className="sticky bottom-0 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs leading-5 text-slate-500 dark:text-slate-400">مرحلهٔ بایگانی‌شده حذف دائمی نمی‌شود تا سوابق پرونده‌ها حفظ بمانند.</small>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={saving} onClick={onClose}>انصراف</Button>
            <Button type="button" variant="primary" className="w-full sm:w-auto" disabled={saving} onClick={() => void save()}>{saving ? 'در حال ذخیره…' : 'ذخیرهٔ گردش‌کار'}</Button>
          </div>
        </footer>
      </section>
    </div>
  )
}
