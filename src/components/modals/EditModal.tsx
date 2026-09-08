import { useState } from 'react'
import type { FormEvent } from 'react'
import { normalizeDigits } from '../../shared'
import { BirthDateField, Icon } from '../../shared-ui'
import { personTags, validNationalId, validBirthDate } from '../../app-lib'
import type { Person } from '../../types'
import { PhotoField } from '../common/PhotoField'

export function EditModal({ person, existing, onClose, onSave }: { person: Person; existing: Person[]; onClose: () => void; onSave: (p: Person, changed: string[]) => void }) {
  const [firstName, setFirstName] = useState(person.firstName)
  const [lastName, setLastName] = useState(person.lastName)
  const [nationalId, setNationalId] = useState(person.nationalId)
  const [birthDate, setBirthDate] = useState(person.birthDate === '—' ? '' : person.birthDate)
  const [fatherName, setFatherName] = useState(person.fatherName)
  const [photo, setPhoto] = useState(person.photo ?? '')
  const [tags, setTags] = useState<string[]>(person.tags ?? [])
  const [deadline, setDeadline] = useState(person.deadline ?? '')
  const [error, setError] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const id = normalizeDigits(nationalId.trim())
    if (!firstName.trim() || !lastName.trim() || !fatherName.trim()) { setError('نام، نام خانوادگی و نام پدر الزامی هستند.'); return }
    if (!validNationalId(id)) { setError('کد ملی معتبر نیست.'); return }
    if (existing.some(p => p.id !== person.id && normalizeDigits(p.nationalId) === id)) { setError('این کد ملی برای فرد دیگری ثبت شده است.'); return }
    const birth = birthDate.trim() ? normalizeDigits(birthDate.trim()) : ''
    if (birth && !validBirthDate(birth)) { setError('تاریخ تولد معتبر نیست.'); return }
    const dl = deadline.trim() ? normalizeDigits(deadline.trim()) : ''
    if (dl && !validBirthDate(dl)) { setError('مهلت پیگیری معتبر نیست.'); return }
    const labels: Record<string, string> = { firstName: 'نام', lastName: 'نام خانوادگی', nationalId: 'کد ملی', birthDate: 'تاریخ تولد', fatherName: 'نام پدر', photo: 'عکس پرسنلی', tags: 'برچسب‌ها', deadline: 'مهلت پیگیری' }
    const next: Person = { ...person, firstName: firstName.trim(), lastName: lastName.trim(), nationalId: id, birthDate: birth || '—', fatherName: fatherName.trim(), photo: photo || undefined, tags, deadline: dl || undefined }
    const disp = (v: unknown) => (v === undefined || v === null || v === '' ? '—' : Array.isArray(v) ? ((v as string[]).length ? (v as string[]).join('، ') : '—') : String(v))
    const changed = (Object.keys(labels) as (keyof Person)[]).filter(key => JSON.stringify(next[key] ?? null) !== JSON.stringify(person[key] ?? null)).map(key => `${labels[key as string]}: ${disp(person[key])} ← ${disp(next[key])}`)
    if (!changed.length) { onClose(); return }
    onSave(next, changed)
  }
  return (
    <div className="backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className="modal" onSubmit={submit}>
        <button type="button" className="x" onClick={onClose}><Icon name="close" /></button>
        <small>ویرایش پرونده · {person.id}</small>
        <h2>ویرایش اطلاعات فرد</h2>
        <p>وضعیت پرونده فقط از مسیر گردش‌کار تغییر می‌کند؛ تغییرات این فرم در تاریخچه ثبت می‌شود.</p>
        <PhotoField value={photo} fallbackInitial={person.firstName[0]} onChange={setPhoto} />
        <h3 className="modal-h">برچسب‌ها <small>— برای اولویت‌بندی و فیلتر</small></h3>
        <div className="tag-picker">
          {Object.keys(personTags).map(t => (
            <button type="button" key={t} className={`tag-chip ${personTags[t]} ${tags.includes(t) ? 'on' : ''}`} onClick={() => setTags(cur => (cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]))}>{t}</button>
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
          <button type="button" className="outline" onClick={onClose}>انصراف</button>
          <button type="submit" className="primary"><Icon name="check" /> ذخیره ویرایش</button>
        </div>
      </form>
    </div>
  )
}
