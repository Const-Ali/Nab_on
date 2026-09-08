import { useState } from 'react'
import type { FormEvent } from 'react'
import { jalaliToday, normalizeDigits, nowStamp } from '../../shared'
import { BirthDateField, Icon } from '../../shared-ui'
import { validNationalId, validBirthDate, validDeadlineDate } from '../../app-lib'
import type { Person } from '../../types'
import { PhotoField } from '../common/PhotoField'

export function CreateModal({ existing, creatorName, onClose, onCreate }: { existing: Person[]; creatorName: string; onClose: () => void; onCreate: (p: Person) => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [photo, setPhoto] = useState('')
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
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
    if (existing.some(p => normalizeDigits(p.nationalId) === id)) {
      setError('این کد ملی قبلاً در سامانه ثبت شده است.')
      return
    }
    const birth = birthDate.trim() ? normalizeDigits(birthDate.trim()) : ''
    if (birth && !validBirthDate(birth)) {
      setError(`تاریخ تولد معتبر نیست (باید در گذشته باشد). مثال: ${jalaliToday().slice(0, 5)}02/12`)
      return
    }
    const dl = deadline.trim() ? normalizeDigits(deadline.trim()) : ''
    if (dl && !validDeadlineDate(dl)) {
      setError('مهلت پیگیری وارد شده معتبر نیست. مثال: ۱۴۰۵/۰۷/۱۵')
      return
    }
    const maxId = existing.reduce((m, p) => Math.max(m, Number(p.id.replace(/\D/g, '')) || 0), 14000)
    onCreate({
      id: `P-${maxId + 1}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nationalId: id,
      birthDate: birth || '—',
      fatherName: fatherName.trim(),
      photo: photo || undefined,
      deadline: dl || undefined,
      status: 'درخواست پرونده',
      updatedAt: nowStamp(),
      updatedBy: creatorName,
    })
  }

  return (
    <div className="backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className="modal" onSubmit={submit}>
        <button type="button" className="x" onClick={onClose} aria-label="بستن"><Icon name="close" /></button>
        <small>ثبت اطلاعات پایه</small>
        <h2>افزودن فرد جدید</h2>
        <p>اطلاعات متنی و عکس پرسنلی (اختیاری) ثبت می‌شود؛ مدرک دیگری بارگذاری نمی‌شود.</p>
        <PhotoField value={photo} fallbackInitial={firstName.trim()[0] ?? 'ن'} onChange={setPhoto} />
        <div className="form-grid">
          <label>نام *<input required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="مثلاً علی" /></label>
          <label>نام خانوادگی *<input required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="مثلاً محمدی" /></label>
          <label>کد ملی *<input required inputMode="numeric" dir="ltr" value={nationalId} onChange={e => { setNationalId(e.target.value); setError('') }} placeholder="۱۰ رقم بدون خط تیره" /></label>
          <label>تاریخ تولد<BirthDateField value={birthDate} onChange={setBirthDate} placeholder="۱۳۷۵/۰۴/۱۰" /></label>
          <label>نام پدر *<input required value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder="مثلاً رضا" /></label>
          <label>مهلت پیگیری (اختیاری)<BirthDateField value={deadline} onChange={setDeadline} placeholder="۱۴۰۵/۰۷/۱۵" /></label>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="outline" onClick={onClose}>انصراف</button>
          <button type="submit" className="primary"><Icon name="plus" /> ثبت فرد</button>
        </div>
      </form>
    </div>
  )
}
