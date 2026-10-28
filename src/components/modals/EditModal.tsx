import { Button } from '../common/Button'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { normalizeDigits } from '../../shared'
import { BirthDateField } from '../../shared-ui'
import { personTags, validNationalId, validBirthDate, validDeadlineDate } from '../../app-lib'
import type { Person } from '../../types'
import { PhotoField } from '../common/PhotoField'
import { backdropCls, cn, modalBox, modalFormLayout } from '../ui'

export function EditModal({ person, existing, onClose, onSave }: { person: Person; existing: Person[]; onClose: () => void; onSave: (p: Person, changed: string[]) => void | Promise<void> }) {
  const [firstName, setFirstName] = useState(person.firstName)
  const [lastName, setLastName] = useState(person.lastName)
  const [nationalId, setNationalId] = useState(person.nationalId)
  const [birthDate, setBirthDate] = useState(person.birthDate === '—' ? '' : person.birthDate)
  const [fatherName, setFatherName] = useState(person.fatherName)
  const [photo, setPhoto] = useState(person.photo ?? '')
  const [tags, setTags] = useState<string[]>(person.tags ?? [])
  const [deadline, setDeadline] = useState(person.deadline ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const id = normalizeDigits(nationalId.trim())
    if (!firstName.trim() || !lastName.trim() || !fatherName.trim()) {
      setError('نام، نام خانوادگی و نام پدر الزامی هستند.')
      return
    }
    if (!validNationalId(id)) {
      setError('کد ملی ۱۰ رقمی وارد شده معتبر نیست.')
      return
    }
    if (existing.some(p => p.id !== person.id && normalizeDigits(p.nationalId) === id)) {
      setError('این کد ملی برای فرد دیگری ثبت شده است.')
      return
    }
    const birth = birthDate.trim() ? normalizeDigits(birthDate.trim()) : ''
    if (birth && !validBirthDate(birth)) {
      setError('تاریخ تولد معتبر نیست (باید در گذشته باشد).')
      return
    }
    const dl = deadline.trim() ? normalizeDigits(deadline.trim()) : ''
    if (dl && !validDeadlineDate(dl)) {
      setError('مهلت پیگیری معتبر نیست.')
      return
    }
    const labels: Record<string, string> = {
      firstName: 'نام',
      lastName: 'نام خانوادگی',
      nationalId: 'کد ملی',
      birthDate: 'تاریخ تولد',
      fatherName: 'نام پدر',
      photo: 'عکس پرسنلی',
      tags: 'برچسب‌ها',
      deadline: 'مهلت پیگیری',
    }
    const next: Person = {
      ...person,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nationalId: id,
      birthDate: birth || '—',
      fatherName: fatherName.trim(),
      photo: photo || undefined,
      tags,
      deadline: dl || undefined,
    }
    const disp = (v: unknown) =>
      v === undefined || v === null || v === ''
        ? '—'
        : Array.isArray(v)
          ? ((v as string[]).length ? (v as string[]).join('، ') : '—')
          : String(v)
    const changed = (Object.keys(labels) as (keyof Person)[])
      .filter(key => JSON.stringify(next[key] ?? null) !== JSON.stringify(person[key] ?? null))
      .map(key => `${labels[key as string]}: ${disp(person[key])} ← ${disp(next[key])}`)
    if (!changed.length) {
      onClose()
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(next, changed)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیرهٔ پرونده روی سرور ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={backdropCls} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className={cn(modalBox, modalFormLayout, 'max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom))] max-w-3xl overflow-y-auto sm:max-h-[calc(100vh-2rem)]')} onSubmit={submit}>
        <Button type="button" variant="ghost" size="xs" className="x" onClick={onClose} title="بستن" aria-label="بستن">بستن</Button>
        <small>ویرایش پرونده · {person.id}</small>
        <h2>ویرایش اطلاعات فرد</h2>
        <p>وضعیت پرونده فقط از مسیر گردش‌کار تغییر می‌کند؛ تغییرات این فرم در تاریخچه ثبت می‌شود.</p>
        <PhotoField value={photo} fallbackInitial={person.firstName[0]} onChange={setPhoto} />
        <h3 className="modal-h">برچسب‌ها <small className="modal-h-small">— برای اولویت‌بندی و فیلتر</small></h3>
        <div className="tag-picker">
          {Object.keys(personTags).map(t => (
            <Button
              type="button"
              key={t}
              className={`tag-chip ${personTags[t]} ${tags.includes(t) ? 'on' : ''}`}
              onClick={() => setTags(cur => (cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]))}
            >
              {t}
            </Button>
          ))}
        </div>
        <div className="form-grid">
          <label>نام *<input required value={firstName} onChange={e => setFirstName(e.target.value)} /></label>
          <label>نام خانوادگی *<input required value={lastName} onChange={e => setLastName(e.target.value)} /></label>
          <label>کد ملی *<input required inputMode="numeric" dir="ltr" value={nationalId} onChange={e => { setNationalId(e.target.value); setError('') }} /></label>
          <label>تاریخ تولد<BirthDateField value={birthDate} onChange={setBirthDate} /></label>
          <label>نام پدر *<input required value={fatherName} onChange={e => setFatherName(e.target.value)} /></label>
          <label>مهلت پیگیری<BirthDateField value={deadline} onChange={setDeadline} /></label>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose}> انصراف</Button>
          <Button type="submit" variant="primary" disabled={saving} loading={saving} loadingText="در حال ذخیره روی سرور..."> ذخیره ویرایش</Button>
        </div>
      </form>
    </div>
  )
}
