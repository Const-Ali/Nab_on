import { Button } from '../common/Button'
import { PasswordField } from '../common/PasswordField'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { permissionLabels, permissionGroups, permissionDependencyError, canGrantPermission } from '../../app-lib'
import type { Permission, Role, RoleDef, User } from '../../types'
import { backdropCls, cn, errorBox, formGrid, modalActions, modalBox, modalFormLayout } from '../ui'

export function AddUserModal({ existing, roles, allowedPermissions, canAssignAdmin, onClose, onCreate }: { existing: User[]; roles: RoleDef[]; allowedPermissions: Permission[]; canAssignAdmin: boolean; onClose: () => void; onCreate: (u: User) => Promise<void> | void }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(() => roles.some(item => item.id === 'assistant') ? 'assistant' : roles[0]?.id ?? '')
  const [permissions, setPermissions] = useState<Permission[]>(() => (roles.find(item => item.id === 'assistant')?.permissions ?? []).filter(permission => canGrantPermission(allowedPermissions, permission)))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const toneCycle = ['green', 'blue', 'purple', 'orange']
  const roleOptions: [Role, string][] = roles.filter(item => canAssignAdmin || item.id !== 'admin').map(item => [item.id, item.title])
  const changeRole = (nextRole: Role) => {
    setRole(nextRole)
    setPermissions((roles.find(item => item.id === nextRole)?.permissions ?? []).filter(permission => (nextRole === 'admin' || permission !== 'purge_server_data') && canGrantPermission(allowedPermissions, permission)))
    setError('')
  }
  const togglePermission = (permission: Permission) => {
    if (role === 'admin' || !canGrantPermission(allowedPermissions, permission)) return
    setPermissions(current => current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission])
    setError('')
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const cleanUsername = username.trim().toLowerCase()
    if (!name.trim() || !cleanUsername) { setError('نام و نام کاربری الزامی هستند.'); return }
    if (!/^[a-z0-9_.-]{3,64}$/.test(cleanUsername)) { setError('نام کاربری باید ۳ تا ۶۴ نویسه و شامل حروف لاتین، عدد، نقطه، خط تیره یا زیرخط باشد.'); return }
    if (existing.some(u => u.username === cleanUsername)) { setError('این نام کاربری قبلاً استفاده شده است.'); return }
    if (password.length < 12) { setError('رمز عبور باید حداقل ۱۲ نویسه باشد.'); return }
    const dependencyError = permissionDependencyError(permissions)
    if (dependencyError) { setError(dependencyError); return }
    setSaving(true)
    setError('')
    try {
      const cleanPermissions = role === 'admin' ? permissions : permissions.filter(permission => permission !== 'purge_server_data')
      await onCreate({ name: name.trim(), username: cleanUsername, role, title: roles.find(r => r.id === role)?.title ?? role, tone: toneCycle[existing.length % toneCycle.length], password, active: true, permissions: cleanPermissions })
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
          <label>نقش<select value={roleOptions.some(([value]) => value === role) ? role : roleOptions[0]?.[0] ?? ''} onChange={e => changeRole(e.target.value as Role)}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <h3 className="modal-h">مجوزهای این کاربر <small>— از نقش آغاز می‌شود و اینجا قابل تنظیم است</small></h3>
        <div className="space-y-4">
          {permissionGroups.map(group => (
            <fieldset key={group.title} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <legend className="px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{group.title}</legend>
              <div className="perm-grid">
                {group.permissions.filter(permission => permission !== 'purge_server_data' || role === 'admin').map(permission => <label key={permission} className={role === 'admin' || !canGrantPermission(allowedPermissions, permission) ? 'opacity-50' : undefined}><input type="checkbox" checked={permissions.includes(permission)} disabled={role === 'admin' || !canGrantPermission(allowedPermissions, permission)} onChange={() => togglePermission(permission)} /> {permissionLabels[permission]}</label>)}
              </div>
            </fieldset>
          ))}
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
