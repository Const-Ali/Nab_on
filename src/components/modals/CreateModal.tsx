import { Button } from '../common/Button'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { jalaliToday, normalizeDigits, nowStamp } from '../../shared'
import { BirthDateField } from '../../shared-ui'
import { validNationalId, validBirthDate, validDeadlineDate } from '../../app-lib'
import type { Person } from '../../types'
import { PhotoField } from '../common/PhotoField'
import { backdropCls, cn, errorBox, formGrid, inputCls, labelCls, modalActions, modalBox, modalFormLayout, modalH2, modalP, modalSmall, modalX } from '../ui'

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
    <div className={backdropCls} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className={cn(modalBox, modalFormLayout)} onSubmit={submit}>
        <Button type="button" className={modalX} onClick={onClose} title="بستن" aria-label="بستن">بستن</Button>
        <small className={modalSmall}>ثبت اطلاعات پایه</small>
        <h2 className={modalH2}>افزودن فرد جدید</h2>
        <p className={modalP}>اطلاعات متنی و عکس پرسنلی (اختیاری) ثبت می‌شود؛ مدرک دیگری بارگذاری نمی‌شود.</p>
        <PhotoField value={photo} fallbackInitial={firstName.trim()[0] ?? 'ن'} onChange={setPhoto} />
        <div className={formGrid}>
          <label className={labelCls}>نام *<input className={inputCls} required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="مثلاً علی" /></label>
          <label className={labelCls}>نام خانوادگی *<input className={inputCls} required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="مثلاً محمدی" /></label>
          <label className={labelCls}>کد ملی *<input className={inputCls} required inputMode="numeric" dir="ltr" value={nationalId} onChange={e => { setNationalId(e.target.value); setError('') }} placeholder="۱۰ رقم بدون خط تیره" /></label>
          <label className={labelCls}>تاریخ تولد<BirthDateField value={birthDate} onChange={setBirthDate} placeholder="۱۳۷۵/۰۴/۱۰" /></label>
          <label className={labelCls}>نام پدر *<input className={inputCls} required value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder="مثلاً رضا" /></label>
          <label className={labelCls}>مهلت پیگیری (اختیاری)<BirthDateField value={deadline} onChange={setDeadline} placeholder="۱۴۰۵/۰۷/۱۵" /></label>
        </div>
        {error && <div className={errorBox}>{error}</div>}
        <div className={modalActions}>
          <Button type="button" variant="outline" onClick={onClose}> انصراف</Button>
          <Button type="submit" variant="primary"> ثبت فرد</Button>
        </div>
      </form>
    </div>
  )
}
