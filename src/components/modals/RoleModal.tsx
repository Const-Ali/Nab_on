import { useState } from 'react'
import type { FormEvent } from 'react'
import { nowTs } from '../../shared'
import { Icon } from '../../shared-ui'
import { permissionLabels, allPermissions } from '../../app-lib'
import type { Permission, RoleDef } from '../../types'

export function RoleModal({ existing, onClose, onCreate }: { existing: RoleDef[]; onClose: () => void; onCreate: (r: RoleDef) => void }) {
  const [title, setTitle] = useState('')
  const [id, setId] = useState('')
  const [permissions, setPermissions] = useState<Permission[]>(['view_persons'])
  const [error, setError] = useState('')
  const togglePerm = (p: Permission) => setPermissions(cur => (cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p]))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const cleanId = (id.trim().toLowerCase() || `role-${nowTs().toString(36)}`)
    if (!title.trim()) { setError('عنوان نقش الزامی است.'); return }
    if (!/^[a-z0-9_-]+$/.test(cleanId)) { setError('شناسه نقش فقط حروف لاتین، عدد و _- می‌پذیرد.'); return }
    if (existing.some(r => r.id === cleanId)) { setError('این شناسه قبلاً استفاده شده است.'); return }
    if (!permissions.length) { setError('حداقل یک مجوز انتخاب کنید.'); return }
    onCreate({ id: cleanId, title: title.trim(), permissions })
  }
  return (
    <div className="backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form className="modal" onSubmit={submit}>
        <button type="button" className="x" onClick={onClose}><Icon name="close" /></button>
        <small>نقش سازمانی جدید</small>
        <h2>تعریف نقش سفارشی</h2>
        <p>کاربرانی که این نقش را بگیرند، مجوزهای زیر را خواهند داشت؛ بعداً برای هر کاربر قابل تنظیم است.</p>
        <div className="form-grid">
          <label>عنوان نقش *<input required value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً ناظر بازرسی" /></label>
          <label>شناسه لاتین<input dir="ltr" value={id} onChange={e => { setId(e.target.value); setError('') }} placeholder="اختیاری، مثل auditor" /></label>
        </div>
        <h3 className="modal-h">مجوزهای این نقش</h3>
        <div className="perm-grid">
          {allPermissions.map(p => <label key={p}><input type="checkbox" checked={permissions.includes(p)} onChange={() => togglePerm(p)} /> {permissionLabels[p]}</label>)}
        </div>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="outline" onClick={onClose}>انصراف</button>
          <button type="submit" className="primary"><Icon name="plus" /> ایجاد نقش</button>
        </div>
      </form>
    </div>
  )
}
