import { Button } from '../common/Button'
import { ServerDataTools } from './ServerDataTools'
import { Avatar, Heading } from '../../shared-ui'
import { permissionLabels, allPermissions } from '../../app-lib'
import type { RoleDef, User } from '../../types'
import { cn, offChip, panelBox, panelH2 } from '../ui'

export function Users({
  users,
  roles,
  currentUser,
  selfUsername,
  canViewUsers,
  canViewRoles,
  canEditUsers,
  canCreateUsers,
  canDeleteUsers,
  canCreateRoles,
  canEditRoles,
  canDeleteRoles,
  canExportBackup,
  canRestoreBackup,
  canPurgeServerData,
  onAdd,
  onEdit,
  onDelete,
  onAddRole,
  onEditRole,
  onDeleteRole,
}: {
  users: User[]
  roles: RoleDef[]
  currentUser: User
  selfUsername: string
  canViewUsers: boolean
  canViewRoles: boolean
  canEditUsers: boolean
  canCreateUsers: boolean
  canDeleteUsers: boolean
  canCreateRoles: boolean
  canEditRoles: boolean
  canDeleteRoles: boolean
  canExportBackup: boolean
  canRestoreBackup: boolean
  canPurgeServerData: boolean
  onAdd: () => void
  onEdit: (u: User) => void
  onDelete: (u: User) => void
  onAddRole: () => void
  onEditRole: (r: RoleDef) => void
  onDeleteRole: (r: RoleDef) => void
}) {
  const canManageSomeAccounts = canCreateUsers || canEditUsers || canDeleteUsers
  return (
    <>
      <Heading
        title="کاربران و دسترسی‌ها"
        subtitle={canManageSomeAccounts || canCreateRoles || canEditRoles || canDeleteRoles || canExportBackup || canRestoreBackup || canPurgeServerData
          ? 'مجوز مشاهده، عملیات مدیریتی، پشتیبان‌گیری و پاکسازی جداگانه کنترل می‌شود.'
          : 'فهرست فقط‌خواندنی حساب‌ها و نقش‌هایی که مجوز مشاهدهٔ آن‌ها را دارید.'}
        action={canCreateUsers ? <Button variant="primary" onClick={onAdd}>کاربر جدید</Button> : undefined}
      />

      {canViewUsers && <section className={panelBox}>
        {users.map(user => (
          <div className={cn('flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800', !user.active && 'opacity-60')} key={user.username}>
            <Avatar text={user.name[0]} tone={user.tone} src={canEditUsers ? user.photo : undefined} />
            <span className="min-w-0 flex-1">
              <b className="block text-sm text-slate-800 dark:text-slate-100">{user.name}{!user.active && <i className={offChip}>غیرفعال</i>}</b>
              <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{user.title} · {user.username}@</small>
              {canEditUsers && <em className="mt-1 block text-xs not-italic text-emerald-600 dark:text-emerald-400">{user.permissions.length.toLocaleString('fa-IR')} مجوز فعال</em>}
            </span>
            {canEditUsers && <Button type="button" variant="outline" size="xs" title="ویرایش سطح دسترسی" onClick={() => onEdit(user)}>ویرایش دسترسی</Button>}
            {canDeleteUsers && <Button
              type="button"
              variant="dangerGhost"
              size="xs"
              disabled={user.username === selfUsername}
              title={user.username === selfUsername ? 'حساب فعلی را نمی‌توان حذف کرد' : 'حذف کاربر'}
              aria-label={user.username === selfUsername ? 'حساب فعلی قابل حذف نیست' : `حذف کاربر ${user.name}`}
              onClick={() => onDelete(user)}
            >حذف</Button>}
          </div>
        ))}
        {!users.length && <p className="p-5 text-sm text-slate-500">حسابی برای نمایش وجود ندارد.</p>}
      </section>}

      {canViewRoles && <section className={cn(panelBox, 'mt-5 p-4 sm:p-5')}>
        <h2 className={panelH2}>نقش‌های سازمانی <small className="mr-2 text-xs font-normal text-slate-500 dark:text-slate-400">{roles.length.toLocaleString('fa-IR')} نقش تعریف‌شده</small></h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">مجوزهای نقش هنگام ایجاد یا تغییر نقش کاربر پیش‌فرض هستند؛ مجوزهای هر حساب نیز جداگانه قابل تنظیم‌اند.</p>
        {roles.map(role => (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800" key={role.id}>
            <span><b className="block text-sm text-slate-800 dark:text-slate-100">{role.title}</b><small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{role.id} · {role.permissions.length.toLocaleString('fa-IR')} مجوز{role.builtin ? ' · پیش‌فرض' : ' · سفارشی'}</small></span>
            {(canEditRoles || (canDeleteRoles && !role.builtin)) && <div className="flex items-center gap-2">
              {canEditRoles && <Button type="button" variant="outline" size="xs" title={`ویرایش مجوزهای نقش ${role.title}`} onClick={() => onEditRole(role)}>ویرایش مجوزها</Button>}
              {canDeleteRoles && !role.builtin && <Button type="button" variant="dangerGhost" size="xs" title={`حذف نقش ${role.title}`} onClick={() => onDeleteRole(role)}>حذف نقش</Button>}
            </div>}
          </div>
        ))}
        {canCreateRoles && <Button type="button" variant="outline" className="mt-4 w-full" onClick={onAddRole}>تعریف نقش جدید</Button>}
        {!canCreateRoles && !canEditRoles && !canDeleteRoles && <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">این فهرست فقط‌خواندنی است.</p>}
      </section>}

      {(canExportBackup || canRestoreBackup || canPurgeServerData) && <ServerDataTools canExport={canExportBackup} canRestore={canRestoreBackup} canPurge={canPurgeServerData} />}

      <section className={cn(panelBox, 'mt-5 p-4 sm:p-5')}>
        <h2 className={panelH2}>مجوزهای شما ({currentUser.title})</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">مجوزهای زیر از نقش و تنظیم اختصاصی حساب شما به دست می‌آیند.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {currentUser.permissions.filter(permission => currentUser.role === 'admin' || permission !== 'purge_server_data').map(permission => <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" key={permission}>{permissionLabels[permission]}</span>)}
          {allPermissions.filter(permission => (currentUser.role === 'admin' || permission !== 'purge_server_data') && !currentUser.permissions.includes(permission)).map(permission => <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-400 dark:bg-slate-800 dark:text-slate-500" key={permission}>{permissionLabels[permission]}</span>)}
          {!currentUser.permissions.length && <span className="text-sm text-slate-500">هیچ مجوز کاربردی برای حساب شما فعال نیست.</span>}
        </div>
      </section>
    </>
  )
}
