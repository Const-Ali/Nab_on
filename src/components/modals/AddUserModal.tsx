import { Button } from '../common/Button'
import { PasswordField } from '../common/PasswordField'
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
    if (!/^[a-z0-9_.-]{3,64}$/.test(cleanUsername)) { setError('نام کاربری باید ۳ تا ۶۴ نویسه و شامل حروف لاتین، عدد، نقطه، خط تیره یا زیرخط باشد.'); return }
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
        <div className={cn(formGrid, 'form-grid')}>
          <label>نام و نام خانوادگی *<input required maxLength={160} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>
          <label>نام کاربری *<input required minLength={3} maxLength={64} dir="ltr" autoComplete="username" value={username} onChange={e => { setUsername(e.target.value); setError('') }} /></label>
          <div className="block text-sm font-medium text-slate-700 dark:text-slate-200"><label htmlFor="add-user-password">رمز عبور *</label><PasswordField id="add-user-password" required minLength={12} dir="ltr" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} /></div>
          <label>نقش<select value={role} onChange={e => setRole(e.target.value as Role)}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <h3 className="modal-h">مجوزهای این نقش <small>— بعداً برای هر کاربر قابل ویرایش است</small></h3>
        <div className="permission-list">
          {(roles.find(r => r.id === role)?.permissions ?? []).map(p => <span key={p}>{permissionLabels[p]}</span>)}
        </div>
        {error && <div className={errorBox} role="alert" aria-live="assertive">{error}</div>}
        <div className={modalActions}>
          <Button type="button" variant="outline" onClick={onClose}> انصراف</Button>
          <Button type="submit" variant="primary" loading={saving} loadingText="در حال ایجاد..."> ایجاد کاربر</Button>
        </div>
      </form>
    </div>
  )
}
