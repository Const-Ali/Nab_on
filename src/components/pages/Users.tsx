import { Button } from "../common/Button";
import { Avatar, Heading } from "../../shared-ui";
import { permissionLabels, allPermissions } from "../../app-lib";
import type { RoleDef, User } from "../../types";
import { cn, offChip, panelBox, panelH2 } from "../ui";

export function Users({
  users,
  roles,
  currentUser,
  selfUsername,
  onAdd,
  onEdit,
  onDelete,
  onAddRole,
  onDeleteRole,
}: {
  users: User[];
  roles: RoleDef[];
  currentUser: User;
  selfUsername: string;
  onAdd: () => void;
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
  onAddRole: () => void;
  onDeleteRole: (r: RoleDef) => void;
}) {
  return (
    <>
      <Heading
        title="کاربران و دسترسی‌ها"
        subtitle="تعریف حساب ورود، سطح دسترسی و فعال/غیرفعال کردن کاربران."
        action={
          <Button variant="primary" onClick={onAdd}>
            {" "}
            کاربر جدید
          </Button>
        }
      />
      <section className={panelBox}>
        {users.map((u) => (
          <div
            className={cn(
              "flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5 dark:border-slate-800",
              !u.active && "opacity-60",
            )}
            key={u.username}
          >
            <Avatar text={u.name[0]} tone={u.tone} src={u.photo} />
            <span className="min-w-0 flex-1">
              <b className="block text-sm text-slate-800 dark:text-slate-100">
                {u.name}
                {!u.active && <i className={offChip}>غیرفعال</i>}
              </b>
              <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                {u.title} · {u.username}@
              </small>
              <em className="mt-1 block text-xs not-italic text-emerald-600 dark:text-emerald-400">
                {u.permissions.length.toLocaleString("fa-IR")} مجوز فعال
              </em>
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              title="ویرایش سطح دسترسی"
              onClick={() => onEdit(u)}
            >
              {" "}
              دسترسی
            </Button>
            <Button
              type="button"
              variant="dangerGhost"
              size="xs"
              disabled={u.username === selfUsername}
              title={
                u.username === selfUsername
                  ? "حساب فعلی را نمی‌توان حذف کرد"
                  : "حذف کاربر"
              }
              aria-label={
                u.username === selfUsername
                  ? "حساب فعلی قابل حذف نیست"
                  : `حذف کاربر ${u.name}`
              }
              onClick={() => onDelete(u)}
            >
              حذف
            </Button>
          </div>
        ))}
      </section>
      <section className={cn(panelBox, "mt-5 p-4 sm:p-5")}>
        <h2 className={panelH2}>
          نقش‌های سازمانی{" "}
          <small className="mr-2 text-xs font-normal text-slate-500 dark:text-slate-400">
            {roles.length.toLocaleString("fa-IR")} نقش تعریف‌شده
          </small>
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          مجوزهای هر نقش هنگام تخصیص به کاربر به‌صورت خودکار اعمال می‌شود؛
          نقش‌های پیش‌فرض قابل حذف نیستند.
        </p>
        {roles.map((r) => (
          <div
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
            key={r.id}
          >
            <span>
              <b className="block text-sm text-slate-800 dark:text-slate-100">
                {r.title}
              </b>
              <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                {r.id} · {r.permissions.length.toLocaleString("fa-IR")} مجوز
                {r.builtin ? " · پیش‌فرض" : " · سفارشی"}
              </small>
            </span>
            {!r.builtin && (
              <Button
                type="button"
                variant="dangerGhost"
                size="xs"
                title={`حذف نقش ${r.title}`}
                onClick={() => onDeleteRole(r)}
              >
                حذف نقش
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          onClick={onAddRole}
        >
          {" "}
          تعریف نقش جدید
        </Button>
      </section>
      <section className={cn(panelBox, "mt-5 p-4 sm:p-5")}>
        <h2 className={panelH2}>مجوزهای شما ({currentUser.title})</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          علی محمدی می‌تواند برای هر کاربر مجوزها را به‌صورت جداگانه تنظیم کند.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {currentUser.permissions.map((p) => (
            <span
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              key={p}
            >
              {permissionLabels[p]}
            </span>
          ))}
          {allPermissions
            .filter((p) => !currentUser.permissions.includes(p))
            .map((p) => (
              <span
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                key={p}
              >
                {permissionLabels[p]}
              </span>
            ))}
        </div>
      </section>
    </>
  );
}
