import { Button } from '../common/Button'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { permissionLabels } from '../../app-lib'
import type { Role, RoleDef, User } from '../../types'
import { backdropCls, cn, errorBox, formGrid, modalActions, modalBox, modalFormLayout } from '../ui'

export function AddUserModal({ existing, roles, onClose, onCreate }: { existing: User[]; roles: RoleDef[]; onClose: () => void; onCreate: (u: User) => Promise<void> | void }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('assistant')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const toneCycle = ['green', 'blue', 'purple', 'orange']
  const roleOptions: [Role, string][] = roles.map(r => [r.id, r.title])
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const cleanUsername = username.trim().toLowerCase()
    if (!name.trim() || !cleanUsername) { setError('نام و نام کاربری الزامی هستند.'); return }
    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) { setError('نام کاربری فقط می‌تواند شامل حروف لاتین، عدد و ._- باشد.'); return }
    if (existing.some(u => u.username === cleanUsername)) { setError('این نام کاربری قبلاً استفاده شده است.'); return }
    if (password.length < 12) { setError('رمز عبور باید حداقل ۱۲ نویسه باشد.'); return }
    setSaving(true)
    setError('')
    try {
      await onCreate({ name: name.trim(), username: cleanUsername, role, title: roles.find(r => r.id === role)?.title ?? role, tone: toneCycle[existing.length % toneCycle.length], password, active: true, permissions: [...(roles.find(r => r.id === role)?.permissions ?? [])] })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ایجاد کاربر ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className={backdropCls} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className={cn(modalBox, modalFormLayout)} onSubmit={submit}>
        <Button type="button" variant="ghost" size="xs" className="x" onClick={onClose} title="بستن" aria-label="بستن">بستن</Button>
        <small>کاربر جدید</small>
        <h2>ایجاد حساب ورود</h2>
        <p>کاربر با همین نام کاربری و رمز عبور وارد سامانه می‌شود؛ سطح دسترسی را مشخص کنید.</p>
        <div className={formGrid}>
          <label>نام و نام خانوادگی *<input required value={name} onChange={e => setName(e.target.value)} /></label>
          <label>نام کاربری *<input required dir="ltr" autoComplete="off" value={username} onChange={e => { setUsername(e.target.value); setError('') }} /></label>
          <label>رمز عبور *<input type="password" required minLength={12} dir="ltr" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} /></label>
          <label>نقش<select value={role} onChange={e => setRole(e.target.value as Role)}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <h3 className="modal-h">مجوزهای این نقش <small>— بعداً برای هر کاربر قابل ویرایش است</small></h3>
        <div className="permission-list">
          {(roles.find(r => r.id === role)?.permissions ?? []).map(p => <span key={p}>{permissionLabels[p]}</span>)}
        </div>
        {error && <div className={errorBox}>{error}</div>}
        <div className={modalActions}>
          <Button type="button" variant="outline" onClick={onClose}> انصراف</Button>
          <Button type="submit" variant="primary" loading={saving} loadingText="در حال ایجاد..."> ایجاد کاربر</Button>
        </div>
      </form>
    </div>
  )
}
