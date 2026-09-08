import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../shared-ui'
import { permissionLabels, allPermissions } from '../../app-lib'
import type { Permission, Role, RoleDef, User } from '../../types'

export function EditUserModal({ user, roles, isSelf, onClose, onSave }: { user: User; roles: RoleDef[]; isSelf: boolean; onClose: () => void; onSave: (u: User, changes: string[]) => void }) {
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState<Role>(user.role)
  const [password, setPassword] = useState('')
  const [active, setActive] = useState(user.active)
  const [permissions, setPermissions] = useState<Permission[]>(user.permissions)
  const [error, setError] = useState('')
  const roleOptions: [Role, string][] = roles.map(r => [r.id, r.title])
  const changeRole = (next: Role) => { setRole(next); setPermissions([...(roles.find(r => r.id === next)?.permissions ?? [])]) }
  const togglePerm = (p: Permission) => setPermissions(cur => cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('نام الزامی است.'); return }
    if (password && password.length < 4) { setError('رمز عبور باید حداقل ۴ کاراکتر باشد.'); return }
    if (!permissions.length) { setError('حداقل یک مجوز باید فعال باشد.'); return }
    const next: User = { ...user, name: name.trim(), role, title: roles.find(r => r.id === role)?.title ?? role, active, permissions, password: password || user.password }
    const changes: string[] = []
    if (next.name !== user.name) changes.push('نام')
    if (next.role !== user.role) changes.push('نقش')
    if (password) changes.push('رمز عبور')
    if (next.active !== user.active) changes.push(next.active ? 'فعال‌سازی ورود' : 'غیرفعال‌سازی ورود')
    if ([...next.permissions].sort().join() !== [...user.permissions].sort().join()) changes.push('مجوزها')
    if (!changes.length) { onClose(); return }
    onSave(next, changes)
  }
  return (
    <div className="backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className="modal" onSubmit={submit}>
        <button type="button" className="x" onClick={onClose}><Icon name="close" /></button>
        <small>تنظیم دسترسی · {user.username}@</small>
        <h2>سطح دسترسی کاربر</h2>
        <div className="form-grid">
          <label>نام و نام خانوادگی *<input required value={name} onChange={e => setName(e.target.value)} /></label>
          <label>نقش<select value={role} onChange={e => changeRole(e.target.value as Role)}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>رمز عبور جدید<input dir="ltr" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="فقط برای تغییر وارد کنید" /></label>
        </div>
        <h3 className="modal-h">مجوزها <small>— با تغییر نقش به‌صورت خودکار پر می‌شود</small></h3>
        <div className="perm-grid">
          {allPermissions.map(p => <label key={p}><input type="checkbox" checked={permissions.includes(p)} onChange={() => togglePerm(p)} /> {permissionLabels[p]}</label>)}
        </div>
        <div className="act-row">
          <span>امکان ورود به سامانه{isSelf ? ' (حساب خود شما)' : ''}</span>
          <label className="remember"><input type="checkbox" checked={active} disabled={isSelf} onChange={e => setActive(e.target.checked)} /> {active ? 'فعال' : 'غیرفعال'}</label>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="outline" onClick={onClose}>انصراف</button>
          <button type="submit" className="primary"><Icon name="check" /> ذخیره دسترسی</button>
        </div>
      </form>
    </div>
  )
}
