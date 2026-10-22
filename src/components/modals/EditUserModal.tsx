import { Button } from '../common/Button'
import { PasswordField } from '../common/PasswordField'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { permissionLabels, permissionGroups, permissionDependencyError, canGrantPermission } from '../../app-lib'
import type { Permission, Role, RoleDef, User } from '../../types'
import { backdropCls, cn, modalBox, modalFormLayout } from '../ui'

export function EditUserModal({ user, roles, allowedPermissions, canAssignAdmin, isSelf, onClose, onSave }: { user: User; roles: RoleDef[]; allowedPermissions: Permission[]; canAssignAdmin: boolean; isSelf: boolean; onClose: () => void; onSave: (u: User, changes: string[]) => Promise<void> | void }) {
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState<Role>(user.role)
  const [password, setPassword] = useState('')
  const [active, setActive] = useState(user.active)
  const [permissions, setPermissions] = useState<Permission[]>(user.permissions)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const roleOptions: [Role, string][] = roles.filter(item => canAssignAdmin || item.id !== 'admin' || item.id === user.role).map(item => [item.id, item.title])
  const canToggle = (permission: Permission) => role !== 'admin' && (canGrantPermission(allowedPermissions, permission) || user.permissions.includes(permission))
  const changeRole = (next: Role) => {
    setRole(next)
    setPermissions((roles.find(item => item.id === next)?.permissions ?? []).filter(permission => (next === 'admin' || permission !== 'purge_server_data') && (canGrantPermission(allowedPermissions, permission) || user.permissions.includes(permission))))
    setError('')
  }
  const togglePerm = (permission: Permission) => {
    if (!canToggle(permission)) return
    setPermissions(current => current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission])
    setError('')
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('نام الزامی است.'); return }
    if (password && password.length < 12) { setError('رمز عبور باید حداقل ۱۲ نویسه باشد.'); return }
    const dependencyError = permissionDependencyError(permissions)
    if (dependencyError) { setError(dependencyError); return }
    const cleanPermissions = role === 'admin' ? permissions : permissions.filter(permission => permission !== 'purge_server_data')
    const next: User = { ...user, name: name.trim(), role, title: roles.find(r => r.id === role)?.title ?? role, active, permissions: cleanPermissions, ...(password ? { password } : {}) }
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
          <label>نقش<select value={roleOptions.some(([value]) => value === role) ? role : roleOptions[0]?.[0] ?? ''} onChange={e => changeRole(e.target.value as Role)}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="block text-sm font-medium text-slate-700 dark:text-slate-200"><label htmlFor="edit-user-password">رمز عبور جدید</label><PasswordField id="edit-user-password" minLength={12} dir="ltr" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="فقط برای تغییر وارد کنید" /></div>
        </div>
        <h3 className="modal-h">مجوزها <small>— با تغییر نقش به‌صورت خودکار پر می‌شود</small></h3>
        <div className="space-y-4">
          {permissionGroups.map(group => (
            <fieldset key={group.title} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <legend className="px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{group.title}</legend>
              <div className="perm-grid">
                {group.permissions.filter(p => p !== 'purge_server_data' || role === 'admin').map(p => <label key={p} className={!canToggle(p) ? 'opacity-50' : undefined}><input type="checkbox" checked={permissions.includes(p)} disabled={!canToggle(p)} onChange={() => togglePerm(p)} /> {permissionLabels[p]}</label>)}
              </div>
            </fieldset>
          ))}
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
