import { Button } from '../common/Button'
import { PasswordField } from '../common/PasswordField'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { permissionLabels, allPermissions } from '../../app-lib'
import type { Permission, Role, RoleDef, User } from '../../types'
import { backdropCls, cn, modalBox, modalFormLayout } from '../ui'

export function EditUserModal({ user, roles, isSelf, onClose, onSave }: { user: User; roles: RoleDef[]; isSelf: boolean; onClose: () => void; onSave: (u: User, changes: string[]) => Promise<void> | void }) {
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState<Role>(user.role)
  const [password, setPassword] = useState('')
  const [active, setActive] = useState(user.active)
  const [permissions, setPermissions] = useState<Permission[]>(user.permissions)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const roleOptions: [Role, string][] = roles.map(r => [r.id, r.title])
  const changeRole = (next: Role) => { setRole(next); setPermissions([...(roles.find(r => r.id === next)?.permissions ?? [])]) }
  const togglePerm = (p: Permission) => setPermissions(cur => cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p])
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('نام الزامی است.'); return }
    if (password && password.length < 12) { setError('رمز عبور باید حداقل ۱۲ نویسه باشد.'); return }
    if (!permissions.length) { setError('حداقل یک مجوز باید فعال باشد.'); return }
    const next: User = { ...user, name: name.trim(), role, title: roles.find(r => r.id === role)?.title ?? role, active, permissions, ...(password ? { password } : {}) }
    const changes: string[] = []
    if (next.name !== user.name) changes.push('نام')
    if (next.role !== user.role) changes.push('نقش')
    if (password) changes.push('رمز عبور')
    if (next.active !== user.active) changes.push(next.active ? 'فعال‌سازی ورود' : 'غیرفعال‌سازی ورود')
    if ([...next.permissions].sort().join() !== [...user.permissions].sort().join()) changes.push('مجوزها')
    if (!changes.length) { onClose(); return }
    setSaving(true)
    setError('')
    try { await onSave(next, changes) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'ذخیرهٔ کاربر ناموفق بود.') }
    finally { setSaving(false) }
  }
  return (
    <div className={backdropCls} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className={cn(modalBox, modalFormLayout)} onSubmit={submit}>
        <Button type="button" variant="ghost" size="xs" className="x" onClick={onClose} title="بستن" aria-label="بستن">بستن</Button>
        <small>تنظیم دسترسی · {user.username}@</small>
        <h2>سطح دسترسی کاربر</h2>
        <div className="form-grid">
          <label>نام و نام خانوادگی *<input required maxLength={160} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>
          <label>نقش<select value={role} onChange={e => changeRole(e.target.value as Role)}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="block text-sm font-medium text-slate-700 dark:text-slate-200"><label htmlFor="edit-user-password">رمز عبور جدید</label><PasswordField id="edit-user-password" minLength={12} dir="ltr" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="فقط برای تغییر وارد کنید" /></div>
        </div>
        <h3 className="modal-h">مجوزها <small>— با تغییر نقش به‌صورت خودکار پر می‌شود</small></h3>
        <div className="perm-grid">
          {allPermissions.map(p => <label key={p}><input type="checkbox" checked={permissions.includes(p)} onChange={() => togglePerm(p)} /> {permissionLabels[p]}</label>)}
        </div>
        <div className="act-row">
          <span>امکان ورود به سامانه{isSelf ? ' (حساب خود شما)' : ''}</span>
          <label className="remember"><input type="checkbox" checked={active} disabled={isSelf} onChange={e => setActive(e.target.checked)} /> {active ? 'فعال' : 'غیرفعال'}</label>
        </div>
        {error && <div className="error" role="alert" aria-live="assertive">{error}</div>}
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose}> انصراف</Button>
          <Button type="submit" variant="primary" loading={saving} loadingText="در حال ذخیره..."> ذخیره دسترسی</Button>
        </div>
      </form>
    </div>
  )
}
