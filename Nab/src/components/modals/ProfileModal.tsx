import { Button } from '../common/Button'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '../../types'
import { PhotoField } from '../common/PhotoField'
import { backdropCls, cn, modalBox, modalFormLayout } from '../ui'

export function ProfileModal({ user, onClose, onSave, onLogout }: { user: User; onClose: () => void; onSave: (name: string, photo: string, newPassword: string) => void; onLogout: () => void }) {
  const [name, setName] = useState(user.name)
  const [photo, setPhoto] = useState(user.photo ?? '')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('نام الزامی است.'); return }
    if (current || next || confirm) {
      if (current !== user.password) { setError('رمز فعلی نادرست است.'); return }
      if (next.length < 4) { setError('رمز جدید باید حداقل ۴ کاراکتر باشد.'); return }
      if (next !== confirm) { setError('تکرار رمز جدید مطابقت ندارد.'); return }
    }
    onSave(name.trim(), photo, next)
  }
  return (
    <div className={backdropCls} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className={cn(modalBox, modalFormLayout)} onSubmit={submit}>
        <Button type="button" variant="ghost" size="xs" className="x" onClick={onClose} title="بستن" aria-label="بستن">بستن</Button>
        <small>پروفایل من · {user.username}@</small>
        <h2>حساب کاربری</h2>
        <PhotoField value={photo} fallbackInitial={name.trim()[0] ?? 'ن'} onChange={setPhoto} />
        <div className="form-grid">
          <label>نام و نام خانوادگی *<input required value={name} onChange={e => setName(e.target.value)} /></label>
          <label>سمت<input value={user.title} disabled /></label>
        </div>
        <h3 className="modal-h">تغییر رمز عبور <small>— خالی بگذارید اگر نمی‌خواهید تغییر کند</small></h3>
        <div className="form-grid">
          <label>رمز فعلی<input type="password" dir="ltr" autoComplete="current-password" value={current} onChange={e => { setCurrent(e.target.value); setError('') }} /></label>
          <span />
          <label>رمز جدید<input type="password" dir="ltr" autoComplete="new-password" value={next} onChange={e => { setNext(e.target.value); setError('') }} /></label>
          <label>تکرار رمز جدید<input type="password" dir="ltr" autoComplete="new-password" value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} /></label>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose}> بستن</Button>
          <Button type="button" variant="danger" onClick={onLogout}> خروج از حساب</Button>
          <Button type="submit" variant="primary"> ذخیره پروفایل</Button>
        </div>
      </form>
    </div>
  )
}
