import { Button } from '../../components/common/Button'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { BirthDateField } from '../../shared-ui'
import { normalizeDigits } from '../../shared'
import { validJalaliDate } from '../utils'
import { taskPriorityLabels, taskPriorityOrder, taskStatusLabels, taskStatusOrder, taskTypeLabels } from '../types'
import type { TaskFields, TaskPriority, TaskStatus, TaskType, WorkTask } from '../types'
import { backdropCls, cn, errorBox, formGrid, inputCls, modalActions, modalBox, modalFormLayout, modalH2, modalP, modalSmall, selectCls, textareaCls } from '../../components/ui'

interface Props {
  initial: WorkTask | null
  typeDefault: TaskType
  categories: string[]
  onClose: () => void
  onSave: (fields: TaskFields) => void
}

export default function TaskForm({ initial, typeDefault, categories, onClose, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [type, setType] = useState<TaskType>(initial?.type ?? typeDefault)
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'todo')
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'medium')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join('، '))
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (window.matchMedia('(min-width: 641px) and (pointer: fine)').matches) {
      titleInputRef.current?.focus({ preventScroll: true })
    }
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('عنوان کار الزامی است.')
      return
    }
    const start = startDate.trim() ? normalizeDigits(startDate.trim()) : ''
    const due = dueDate.trim() ? normalizeDigits(dueDate.trim()) : ''
    if (start && !validJalaliDate(start)) {
      setError('تاریخ شروع معتبر نیست. مثال: ۱۴۰۵/۰۶/۱۸')
      return
    }
    if (due && !validJalaliDate(due)) {
      setError('مهلت انجام معتبر نیست. مثال: ۱۴۰۵/۰۶/۲۵')
      return
    }
    const tags = tagsText.split(/[،,]/).map(x => x.trim()).filter(Boolean).slice(0, 8)
    onSave({
      title: title.trim(),
      description: description.trim(),
      type,
      status,
      priority,
      startDate: start,
      dueDate: due,
      category: category.trim(),
      tags,
      note: note.trim(),
    })
  }

  return (
    <div className={backdropCls} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className={cn(modalBox, modalFormLayout, 'max-w-3xl')} onSubmit={submit}>
        <Button type="button" variant="ghost" size="xs" className="x" onClick={onClose} title="بستن" aria-label="بستن">بستن</Button>
        <small className={modalSmall}>{initial ? 'ویرایش کار' : 'کار جدید'}</small>
        <h2 className={modalH2}>{initial ? `ویرایش «${initial.title}»` : 'ایجاد کار جدید'}</h2>
        <p className={modalP}>کارهای شخصی فقط برای شما قابل مشاهده است؛ کارهای سازمانی بین ایجادکننده و مسئول مشترک می‌شود.</p>

        <div className={formGrid}>
          <label className="col-span-2 max-[700px]:col-span-1">
            عنوان کار *
            <input
              className={inputCls}
              ref={titleInputRef}
              required
              value={title}
              onChange={e => { setTitle(e.target.value); setError('') }}
              placeholder="مثلاً تهیه گزارش عملکرد هفتگی"
            />
          </label>
          <label className="col-span-2 max-[700px]:col-span-1">
            توضیحات
            <textarea
              className={textareaCls}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="شرح کوتاه کار..."
            />
          </label>
          <label>
            نوع کار
            <select className={selectCls} value={type} onChange={e => setType(e.target.value as TaskType)}>
              <option value="personal">{taskTypeLabels.personal}</option>
              <option value="organizational">{taskTypeLabels.organizational}</option>
            </select>
          </label>
          <label>
            وضعیت
            <select className={selectCls} value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
              {taskStatusOrder.map(s => <option key={s} value={s}>{taskStatusLabels[s]}</option>)}
            </select>
          </label>
          <label>
            اولویت
            <select className={selectCls} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
              {taskPriorityOrder.map(p => <option key={p} value={p}>{taskPriorityLabels[p]}</option>)}
            </select>
          </label>
          <label>
            دسته‌بندی
            <input
              className={inputCls}
              value={category}
              onChange={e => setCategory(e.target.value)}
              list="wm-cats"
              placeholder="مثلاً اداری، گزارش، مالی..."
            />
          </label>
          <label>
            تاریخ شروع
            <BirthDateField value={startDate} onChange={setStartDate} placeholder="مثال: ۱۴۰۵/۰۶/۱۸" />
          </label>
          <label>
            مهلت انجام
            <BirthDateField value={dueDate} onChange={setDueDate} placeholder="مثال: ۱۴۰۵/۰۶/۲۵" />
          </label>
          <label className="col-span-2 max-[700px]:col-span-1">
            برچسب‌ها
            <input
              className={inputCls}
              value={tagsText}
              onChange={e => setTagsText(e.target.value)}
              placeholder="با «،» جدا کنید: فوری، پیگیری"
            />
          </label>
          <label className="col-span-2 max-[700px]:col-span-1">
            توضیحات تکمیلی
            <textarea
              className={textareaCls}
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="یادداشت داخلی، لینک، جزئیات..."
            />
          </label>
        </div>
        <datalist id="wm-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
        {error && <div className={errorBox}>{error}</div>}
        <div className={modalActions}>
          <Button type="button" variant="outline" onClick={onClose}> انصراف</Button>
          <Button type="submit" variant="primary"> {initial ? 'ذخیره تغییرات' : 'ایجاد کار'}</Button>
        </div>
      </form>
    </div>
  )
}
