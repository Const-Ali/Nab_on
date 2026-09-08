import { useState } from 'react'
import type { FormEvent } from 'react'
import { BirthDateField, Icon } from '../../shared-ui'
import { normalizeDigits } from '../../shared'
import { validJalaliDate } from '../utils'
import { taskPriorityLabels, taskPriorityOrder, taskStatusLabels, taskStatusOrder, taskTypeLabels } from '../types'
import type { TaskFields, TaskPriority, TaskStatus, TaskType, WorkTask } from '../types'

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
    <div className="backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className="modal wm-modal" onSubmit={submit}>
        <button type="button" className="x" onClick={onClose} aria-label="بستن"><Icon name="close" /></button>
        <small>{initial ? 'ویرایش کار' : 'کار جدید'}</small>
        <h2>{initial ? `ویرایش «${initial.title}»` : 'ایجاد کار جدید'}</h2>
        <p>کارهای شخصی فقط برای شما قابل مشاهده است؛ کارهای سازمانی بین ایجادکننده و مسئول مشترک می‌شود.</p>

        <div className="form-grid">
          <label className="col-span-2 max-[700px]:col-span-1">
            عنوان کار *
            <input
              autoFocus
              required
              value={title}
              onChange={e => { setTitle(e.target.value); setError('') }}
              placeholder="مثلاً تهیه گزارش عملکرد هفتگی"
            />
          </label>
          <label className="col-span-2 max-[700px]:col-span-1">
            توضیحات
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="شرح کوتاه کار..."
            />
          </label>
          <label>
            نوع کار
            <select value={type} onChange={e => setType(e.target.value as TaskType)}>
              <option value="personal">{taskTypeLabels.personal}</option>
              <option value="organizational">{taskTypeLabels.organizational}</option>
            </select>
          </label>
          <label>
            وضعیت
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
              {taskStatusOrder.map(s => <option key={s} value={s}>{taskStatusLabels[s]}</option>)}
            </select>
          </label>
          <label>
            اولویت
            <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
              {taskPriorityOrder.map(p => <option key={p} value={p}>{taskPriorityLabels[p]}</option>)}
            </select>
          </label>
          <label>
            دسته‌بندی
            <input
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
              value={tagsText}
              onChange={e => setTagsText(e.target.value)}
              placeholder="با «،» جدا کنید: فوری، پیگیری"
            />
          </label>
          <label className="col-span-2 max-[700px]:col-span-1">
            توضیحات تکمیلی
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="یادداشت داخلی، لینک، جزئیات..."
            />
          </label>
        </div>
        <datalist id="wm-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="outline" onClick={onClose}>انصراف</button>
          <button type="submit" className="primary"><Icon name={initial ? 'check' : 'plus'} /> {initial ? 'ذخیره تغییرات' : 'ایجاد کار'}</button>
        </div>
      </form>
    </div>
  )
}
