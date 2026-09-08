import { Avatar, Heading, Icon } from '../../shared-ui'
import { permissionLabels, allPermissions } from '../../app-lib'
import type { RoleDef, User } from '../../types'

export function Users({ users, roles, currentUser, selfUsername, onAdd, onEdit, onDelete, onAddRole, onDeleteRole }: { users: User[]; roles: RoleDef[]; currentUser: User; selfUsername: string; onAdd: () => void; onEdit: (u: User) => void; onDelete: (u: User) => void; onAddRole: () => void; onDeleteRole: (r: RoleDef) => void }) {
  return (
    <>
      <Heading title="کاربران و دسترسی‌ها" subtitle="تعریف حساب ورود، سطح دسترسی و فعال/غیرفعال کردن کاربران." action={<button className="primary" onClick={onAdd}><Icon name="plus" /> کاربر جدید</button>} />
      <section className="panel users">
        {users.map(u => (
          <div className={`user ${u.active ? '' : 'inactive'}`} key={u.username}>
            <Avatar text={u.name[0]} tone={u.tone} src={u.photo} />
            <span>
              <b>{u.name}{!u.active && <i className="off-chip">غیرفعال</i>}</b>
              <small>{u.title} · {u.username}@</small>
              <em>● {u.permissions.length.toLocaleString('fa-IR')} مجوز فعال</em>
            </span>
            <button type="button" className="mini-btn" title="ویرایش سطح دسترسی" onClick={() => onEdit(u)}><Icon name="edit" /> دسترسی</button>
            <button type="button" title={u.username === selfUsername ? 'کاربر فعلی' : 'حذف کاربر'} onClick={() => onDelete(u)}>•••</button>
          </div>
        ))}
      </section>
      <section className="panel roles-panel">
        <h2>نقش‌های سازمانی <small>{roles.length.toLocaleString('fa-IR')} نقش تعریف‌شده</small></h2>
        <p>مجوزهای هر نقش هنگام تخصیص به کاربر به‌صورت خودکار اعمال می‌شود؛ نقش‌های پیش‌فرض قابل حذف نیستند.</p>
        {roles.map(r => (
          <div className="role-row" key={r.id}>
            <span><b>{r.title}</b><small>{r.id} · {r.permissions.length.toLocaleString('fa-IR')} مجوز{r.builtin ? ' · پیش‌فرض' : ' · سفارشی'}</small></span>
            {!r.builtin && <button type="button" className="mini-btn" title="حذف نقش" onClick={() => onDeleteRole(r)}>حذف</button>}
          </div>
        ))}
        <button type="button" className="outline full" onClick={onAddRole}><Icon name="plus" /> تعریف نقش جدید</button>
      </section>
      <section className="panel permission-panel">
        <h2>مجوزهای شما ({currentUser.title})</h2>
        <p>مدیر سیستم می‌تواند برای هر کاربر مجوزها را به‌صورت جداگانه تنظیم کند.</p>
        <div className="permission-list">
          {currentUser.permissions.map(p => <span key={p}>✓ {permissionLabels[p]}</span>)}
          {allPermissions.filter(p => !currentUser.permissions.includes(p)).map(p => <span className="disabled" key={p}>× {permissionLabels[p]}</span>)}
        </div>
      </section>
    </>
  )
}
