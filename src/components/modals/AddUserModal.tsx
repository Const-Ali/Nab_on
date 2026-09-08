import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../shared-ui'
import { permissionLabels } from '../../app-lib'
import type { Role, RoleDef, User } from '../../types'

export function AddUserModal({ existing, roles, onClose, onCreate }: { existing: User[]; roles: RoleDef[]; onClose: () => void; onCreate: (u: User) => void }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('assistant')
  const [error, setError] = useState('')
  const toneCycle = ['green', 'blue', 'purple', 'orange']
  const roleOptions: [Role, string][] = roles.map(r => [r.id, r.title])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const cleanUsername = username.trim().toLowerCase()
    if (!name.trim() || !cleanUsername) { setError('نام و نام کاربری الزامی هستند.'); return }
    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) { setError('نام کاربری فقط می‌تواند شامل حروف لاتین، عدد و ._- باشد.'); return }
    if (existing.some(u => u.username === cleanUsername)) { setError('این نام کاربری قبلاً استفاده شده است.'); return }
    if (password.length < 4) { setError('رمز عبور باید حداقل ۴ کاراکتر باشد.'); return }
    onCreate({ name: name.trim(), username: cleanUsername, role, title: roles.find(r => r.id === role)?.title ?? role, tone: toneCycle[existing.length % toneCycle.length], password, active: true, permissions: [...(roles.find(r => r.id === role)?.permissions ?? [])] })
  }
  return (
    <div className="backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className="modal" onSubmit={submit}>
        <button type="button" className="x" onClick={onClose}><Icon name="close" /></button>
        <small>کاربر جدید</small>
        <h2>ایجاد حساب ورود</h2>
        <p>کاربر با همین نام کاربری و رمز عبور وارد سامانه می‌شود؛ سطح دسترسی را مشخص کنید.</p>
        <div className="form-grid">
          <label>نام و نام خانوادگی *<input required value={name} onChange={e => setName(e.target.value)} /></label>
          <label>نام کاربری *<input required dir="ltr" autoComplete="off" value={username} onChange={e => { setUsername(e.target.value); setError('') }} /></label>
          <label>رمز عبور *<input required dir="ltr" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} /></label>
          <label>نقش<select value={role} onChange={e => setRole(e.target.value as Role)}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <h3 className="modal-h">مجوزهای این نقش <small>— بعداً برای هر کاربر قابل ویرایش است</small></h3>
        <div className="permission-list">
          {(roles.find(r => r.id === role)?.permissions ?? []).map(p => <span key={p}>✓ {permissionLabels[p]}</span>)}
        </div>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="outline" onClick={onClose}>انصراف</button>
          <button type="submit" className="primary"><Icon name="plus" /> ایجاد کاربر</button>
        </div>
      </form>
    </div>
  )
}
