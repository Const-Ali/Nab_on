import { Button } from '../common/Button'
import { useState } from 'react'
import { Heading } from '../../shared-ui'
import { defaultSettings, fontOptions } from '../../app-lib'
import type { AppSettings } from '../../types'
import { cn, inputCls, labelCls, panelBox, selectCls } from '../ui'
import { VersionInfoCard } from '../common/VersionStatus'
import { useAppVersion } from '../../version'

export function Settings({ settings, canManage, canManageWorkflow, onManageWorkflow, onSave }: {
  settings: AppSettings
  canManage: boolean
  canManageWorkflow: boolean
  onManageWorkflow: () => void
  onSave: (settings: AppSettings) => Promise<void> | void
}) {
  const versionStatus = useAppVersion()
  const [draft, setDraft] = useState<AppSettings>(() => ({ ...defaultSettings, ...settings }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const update = (patch: Partial<AppSettings>) => setDraft(cur => ({ ...cur, ...patch }))
  const toggles: [keyof Pick<AppSettings, 'twoFactor' | 'auditLog' | 'autoLogout'>, string, string][] = [
    ['twoFactor', 'تأیید دو مرحله‌ای', 'برای مدیران الزامی باشد'],
    ['auditLog', 'ثبت رخدادهای امنیتی', 'ذخیره تغییرات حساس در Audit Log'],
    ['autoLogout', 'خروج خودکار', `پس از ${draft.autoLogoutMins.toLocaleString('fa-IR')} دقیقه عدم فعالیت`],
  ]
  const saveSettings = async () => {
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیرهٔ تنظیمات ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <>
      <Heading title="تنظیمات" subtitle="تنظیمات عمومی و امنیتی سامانه؛ دسترسی مشاهده و ویرایش جداگانه است." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={cn(panelBox, 'space-y-4 p-4 sm:p-5')}>
          <h2>تنظیمات عمومی</h2><p>تنظیمات مشترک سامانه روی سرور ذخیره می‌شود.</p>
          <label className={labelCls}>نام سامانه<input className={inputCls} maxLength={100} value={draft.appName} disabled={!canManage} onChange={e => update({ appName: e.target.value })} /></label>
          <label>منطقه زمانی<select className={selectCls} defaultValue="tehran" disabled><option value="tehran">Asia/Tehran (UTC+۳:۳۰)</option></select></label>
          <label>فونت سامانه
            <select className={selectCls} value={draft.font} disabled={!canManage} onChange={e => update({ font: e.target.value as AppSettings['font'] })}>
              {fontOptions.map(f => <option key={f.key} value={f.key}>{f.label} · {f.hint}</option>)}
            </select>
          </label>
          {canManage && <Button variant="primary" loading={saving} loadingText="در حال ذخیره..." onClick={() => void saveSettings()}>ذخیرهٔ تنظیمات</Button>}
          {!canManage && <p className="text-xs text-slate-500 dark:text-slate-400">برای ویرایش این گزینه‌ها مجوز «ویرایش و ذخیرهٔ تنظیمات سامانه» لازم است.</p>}
        </section>
        <section className={cn(panelBox, 'space-y-3 p-4 sm:p-5')}>
          <h2>امنیت و نشست</h2><p>کنترل‌های قابل تنظیم سامانه</p>
          {toggles.map(([key, title, hint]) => (
            <Button type="button" variant="card" size="none" active={Boolean(draft[key])} disabled={!canManage} className="min-h-14 w-full justify-between rounded-xl p-3 text-right" key={key} onClick={() => update({ [key]: !draft[key] })}>
              <span><b className="block text-sm text-slate-800 dark:text-slate-100">{title}</b><small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</small></span>
              <i className={cn('relative h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform dark:bg-slate-700', draft[key] ? 'bg-indigo-600 after:right-6' : 'after:right-1')} />
            </Button>
          ))}
          {draft.autoLogout && (
            <label className="mins-label">مدت زمان خروج خودکار
              <select className={selectCls} value={draft.autoLogoutMins} disabled={!canManage} onChange={e => update({ autoLogoutMins: Number(e.target.value) })}>
                {[5, 10, 15, 30, 60].map(m => <option key={m} value={m}>{m.toLocaleString('fa-IR')} دقیقه</option>)}
              </select>
            </label>
          )}
          {error && <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
        </section>
        {canManageWorkflow && (
          <section className={cn(panelBox, 'space-y-3 p-4 sm:p-5')}>
            <h2>گردش‌کار پرونده</h2>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">ویرایش نام و شرط‌های مرحله، تعداد مرحله‌ها و چک‌لیست دستی. مسیرهای فعلی گردش‌کار ثابت می‌مانند.</p>
            <Button type="button" variant="primary" onClick={onManageWorkflow}>مدیریت گردش‌کار</Button>
          </section>
        )}
        <div className="xl:col-span-2">
          <VersionInfoCard status={versionStatus} onRefresh={versionStatus.refresh} />
        </div>
      </div>
    </>
  )
}
