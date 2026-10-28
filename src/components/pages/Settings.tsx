import { Button } from '../common/Button'
import { PasswordField } from '../common/PasswordField'
import { useState } from 'react'
import type { TotpEnrollmentChallenge } from '../../api-client'
import { Heading } from '../../shared-ui'
import { defaultSettings, fontOptions } from '../../app-lib'
import type { AppSettings } from '../../types'
import { cn, inputCls, labelCls, panelBox, selectCls } from '../ui'
import { VersionInfoCard } from '../common/VersionStatus'
import { useAppVersion } from '../../version'

export function Settings({ settings, canManage, canManageWorkflow, canManageDocumentWorkflow, isSystemAdmin, totpEnrolled, onStartTotpEnrollment, onConfirmTotpEnrollment, onManageWorkflow, onManageDocumentWorkflow, onSave }: {
  settings: AppSettings
  canManage: boolean
  canManageWorkflow: boolean
  canManageDocumentWorkflow: boolean
  isSystemAdmin: boolean
  totpEnrolled: boolean
  onStartTotpEnrollment: (currentPassword: string) => Promise<TotpEnrollmentChallenge>
  onConfirmTotpEnrollment: (code: string) => Promise<void>
  onManageWorkflow: () => void
  onManageDocumentWorkflow: () => void
  onSave: (settings: AppSettings) => Promise<void> | void
}) {
  const versionStatus = useAppVersion()
  const [draft, setDraft] = useState<AppSettings>(() => ({ ...defaultSettings, ...settings }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [enrollment, setEnrollment] = useState<TotpEnrollmentChallenge | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpBusy, setTotpBusy] = useState(false)
  const [totpError, setTotpError] = useState('')
  const [totpNotice, setTotpNotice] = useState('')
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
  const beginTotpEnrollment = async () => {
    setTotpBusy(true)
    setTotpError('')
    setTotpNotice('')
    try {
      const result = await onStartTotpEnrollment(currentPassword)
      setEnrollment(result)
      setTotpCode('')
      setCurrentPassword('')
      setTotpNotice('کلید موقت آماده است؛ آن را در برنامهٔ احراز هویت وارد کنید و ظرف پنج دقیقه تأیید نمایید.')
    } catch (cause) {
      setTotpError(cause instanceof Error ? cause.message : 'آغاز ثبت برنامهٔ احراز هویت ناموفق بود.')
    } finally {
      setTotpBusy(false)
    }
  }
  const confirmTotp = async () => {
    setTotpBusy(true)
    setTotpError('')
    try {
      await onConfirmTotpEnrollment(totpCode.trim())
      setEnrollment(null)
      setTotpCode('')
      setTotpNotice('ثبت برنامهٔ احراز هویت تکمیل شد.')
    } catch (cause) {
      setTotpError(cause instanceof Error ? cause.message : 'تأیید برنامهٔ احراز هویت ناموفق بود.')
    } finally {
      setTotpBusy(false)
    }
  }
  return (
    <>
      <Heading title="تنظیمات" subtitle="تنظیمات عمومی و امنیتی سامانه؛ دسترسی مشاهده و ویرایش جداگانه است." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
          {draft.twoFactor && isSystemAdmin && !totpEnrolled && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">تأیید دومرحله‌ای فعال است، اما هنوز برنامه‌ای برای این حساب مدیر ثبت نشده؛ در ورود بعدی مرحلهٔ ثبت نمایش داده می‌شود. پیش از خروج، ثبت را از همین صفحه انجام دهید.</p>}
          {isSystemAdmin && <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">برنامهٔ احراز هویت مدیر</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">کدهای یک‌بارمصرف TOTP در سرور نگهداری می‌شوند و کلید با رمز حساب شما رمزگذاری می‌شود. ثبت یا جایگزینی دستگاه نیازمند رمز فعلی است.</p>
            </div>
            {!enrollment ? <>
              <p className={totpEnrolled ? 'text-sm text-emerald-700 dark:text-emerald-300' : 'text-sm text-amber-700 dark:text-amber-300'}>{totpEnrolled ? 'یک برنامهٔ احراز هویت برای حساب شما ثبت شده است.' : 'هنوز برنامه‌ای برای این حساب ثبت نشده است.'}</p>
              <label className={labelCls}>رمز فعلی حساب<PasswordField autoComplete="current-password" value={currentPassword} onChange={event => { setCurrentPassword(event.target.value); setTotpError('') }} /></label>
              <Button type="button" variant="outline" loading={totpBusy} loadingText="در حال آماده‌سازی…" disabled={!currentPassword} onClick={() => void beginTotpEnrollment()}>{totpEnrolled ? 'جایگزینی برنامهٔ احراز هویت' : 'ثبت برنامهٔ احراز هویت'}</Button>
            </> : <>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">این کلید موقت را در برنامهٔ سازگار با TOTP وارد کنید و کد فعلی را ثبت کنید:</p>
              <code dir="ltr" className="block select-all break-all rounded-lg bg-slate-100 px-3 py-2 text-center font-mono text-base tracking-widest text-slate-900 dark:bg-slate-800 dark:text-white">{enrollment.secret}</code>
              <a className="block break-all text-xs text-indigo-700 underline dark:text-indigo-300" dir="ltr" href={enrollment.otpauth_uri}>بازکردن پیوند برنامهٔ احراز هویت</a>
              <label className={labelCls}>کد شش‌رقمی تأیید<input className={`${inputCls} text-center font-mono text-lg tracking-[0.35em]`} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} dir="ltr" value={totpCode} onChange={event => { setTotpCode(event.target.value); setTotpError('') }} /></label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="primary" loading={totpBusy} loadingText="در حال تأیید…" disabled={!totpCode.trim()} onClick={() => void confirmTotp()}>تأیید و ثبت دستگاه</Button>
                <Button type="button" variant="outline" disabled={totpBusy} onClick={() => { setEnrollment(null); setTotpCode(''); setTotpError(''); setTotpNotice('') }}>لغو</Button>
              </div>
            </>}
            {totpNotice && <p className="text-xs text-emerald-700 dark:text-emerald-300" role="status">{totpNotice}</p>}
            {totpError && <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{totpError}</p>}
          </div>}
          {error && <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
        </section>
        {canManageWorkflow && <section className={cn(panelBox, 'flex h-full flex-col items-start gap-3 p-4 sm:p-5')}>
          <div>
            <h2>گردش‌کار پرونده‌ها</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">تنظیم مرحله‌ها و چک‌لیست دستی پرونده‌های افراد؛ مسیرهای فعلی حفظ می‌شوند.</p>
          </div>
          <Button type="button" variant="primary" className="mt-auto" onClick={onManageWorkflow}>مدیریت گردش‌کار پرونده‌ها</Button>
        </section>}
        {canManageDocumentWorkflow && <section className={cn(panelBox, 'flex h-full flex-col items-start gap-3 p-4 sm:p-5')}>
          <div>
            <h2>گردش‌کار مدارک</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">افزودن، ویرایش، مرتب‌سازی و حذف مرحله‌ها و شرح آن‌ها؛ مستقل از پرونده‌های افراد.</p>
          </div>
          <Button type="button" variant="primary" className="mt-auto" onClick={onManageDocumentWorkflow}>مدیریت گردش‌کار مدارک</Button>
        </section>}
        <div className="lg:col-span-2">
          <VersionInfoCard status={versionStatus} onRefresh={versionStatus.refresh} />
        </div>
      </div>
    </>
  )
}
