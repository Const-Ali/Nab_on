import { Button } from '../common/Button'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { nowTs } from '../../shared'
import { permissionLabels, permissionGroups, permissionDependencyError, canGrantPermission } from '../../app-lib'
import type { Permission, RoleDef } from '../../types'
import { backdropCls, cn, modalBox, modalFormLayout } from '../ui'

export function RoleModal({
  existing,
  role,
  allowedPermissions,
  onClose,
  onSave,
}: {
  existing: RoleDef[]
  role?: RoleDef
  allowedPermissions?: Permission[]
  onClose: () => void
  onSave: (r: RoleDef) => void | Promise<void>
}) {
  const [title, setTitle] = useState(role?.title ?? '')
  const [id, setId] = useState(role?.id ?? '')
  const [permissions, setPermissions] = useState<Permission[]>(role ? [...role.permissions] : [])
  const [error, setError] = useState('')
  const mayGrant = (permission: Permission) => role?.id === 'admin' || !allowedPermissions || canGrantPermission(allowedPermissions, permission) || Boolean(role?.permissions.includes(permission))
  const togglePerm = (permission: Permission) => {
    if (role?.id === 'admin' || !mayGrant(permission)) return
    setPermissions(current => current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission])
    setError('')
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const cleanId = role?.id ?? (id.trim().toLowerCase() || `role-${nowTs().toString(36)}`)
    if (!title.trim()) { setError('عنوان نقش الزامی است.'); return }
    if (!/^[a-z0-9_-]+$/.test(cleanId)) { setError('شناسه نقش فقط حروف لاتین، عدد و _- می‌پذیرد.'); return }
    if (existing.some(item => item.id === cleanId && item.id !== role?.id)) { setError('این شناسه قبلاً استفاده شده است.'); return }
    const dependencyError = permissionDependencyError(permissions)
    if (dependencyError) { setError(dependencyError); return }
    try {
      const cleanPermissions = cleanId === 'admin' ? permissions : permissions.filter(permission => permission !== 'purge_server_data')
      await onSave({ id: cleanId, title: title.trim(), permissions: cleanPermissions, ...(role?.builtin ? { builtin: true } : {}) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیرهٔ نقش ناموفق بود.')
    }
  }
  return (
    <div className={backdropCls} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <form className={cn(modalBox, modalFormLayout)} onSubmit={submit}>
        <Button type="button" variant="ghost" size="xs" className="x" onClick={onClose} title="بستن" aria-label="بستن">بستن</Button>
        <small>{role ? 'مدیریت نقش سازمانی' : 'نقش سازمانی جدید'}</small>
        <h2>{role ? `ویرایش نقش «${role.title}»` : 'تعریف نقش سفارشی'}</h2>
        <p>مجوزهای نقش پیش‌فرض کاربران آن نقش است؛ دسترسی هر حساب نیز جداگانه قابل تنظیم خواهد بود.</p>
        <div className="form-grid">
          <label>عنوان نقش *<input required maxLength={100} value={title} onChange={event => { setTitle(event.target.value); setError('') }} placeholder="مثلاً ناظر بازرسی" /></label>
          <label>شناسه لاتین<input dir="ltr" value={id} disabled={Boolean(role)} onChange={event => { setId(event.target.value); setError('') }} placeholder="اختیاری، مثل auditor" /></label>
        </div>
        <h3 className="modal-h">مجوزهای این نقش</h3>
        <div className="space-y-4">
          {permissionGroups.map(group => (
            <fieldset key={group.title} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <legend className="px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{group.title}</legend>
              <div className="perm-grid">
                {group.permissions.filter(permission => permission !== 'purge_server_data' || role?.id === 'admin').map(permission => <label key={permission} className={!mayGrant(permission) ? 'opacity-50' : undefined}><input type="checkbox" checked={permissions.includes(permission)} disabled={role?.id === 'admin' || !mayGrant(permission)} onChange={() => togglePerm(permission)} /> {permissionLabels[permission]}</label>)}
              </div>
            </fieldset>
          ))}
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
          <Button type="submit" variant="primary">{role ? 'ذخیرهٔ نقش' : 'ایجاد نقش'}</Button>
        </div>
      </form>
    </div>
  )
}
