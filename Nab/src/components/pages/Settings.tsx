import { Button } from '../common/Button'
import { useState } from 'react'
import { load, save } from '../../shared'
import { Heading } from '../../shared-ui'
import { defaultSettings, fontOptions } from '../../app-lib'
import type { AppSettings } from '../../types'
import { cn, inputCls, labelCls, panelBox, selectCls } from '../ui'

export function Settings({ onSaved }: { onSaved: () => void }) {
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...defaultSettings, ...load('nab:settings', defaultSettings) }))
  const update = (patch: Partial<AppSettings>) => setSettings(cur => ({ ...cur, ...patch }))
  const toggles: [keyof Pick<AppSettings, 'twoFactor' | 'auditLog' | 'autoLogout'>, string, string][] = [
    ['twoFactor', 'تأیید دو مرحله‌ای', 'برای مدیران الزامی باشد'],
    ['auditLog', 'ثبت رخدادهای امنیتی', 'ذخیره تغییرات حساس در Audit Log'],
    ['autoLogout', 'خروج خودکار', `پس از ${settings.autoLogoutMins.toLocaleString('fa-IR')} دقیقه عدم فعالیت`],
  ]
  return (
    <>
      <Heading title="تنظیمات" subtitle="تنظیمات عمومی و امنیتی سامانه ناب." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={cn(panelBox, 'space-y-4 p-4 sm:p-5')}>
          <h2>تنظیمات عمومی</h2><p>اطلاعات پایه سامانه</p>
          <label className={labelCls}>نام سامانه<input className={inputCls} value={settings.appName} onChange={e => update({ appName: e.target.value })} /></label>
          <label>منطقه زمانی<select defaultValue="tehran"><option value="tehran">Asia/Tehran (UTC+۳:۳۰)</option></select></label>
          <label>فونت سامانه
            <select className={selectCls} value={settings.font} onChange={e => update({ font: e.target.value as AppSettings['font'] })}>
              {fontOptions.map(f => <option key={f.key} value={f.key}>{f.label} · {f.hint}</option>)}
            </select>
          </label>
          <Button variant="primary" onClick={() => { save('nab:settings', settings); onSaved() }}> ذخیره تغییرات</Button>
        </section>
        <section className={cn(panelBox, 'space-y-3 p-4 sm:p-5')}>
          <h2>امنیت و نشست</h2><p>کنترل دسترسی و ورود کاربران</p>
          {toggles.map(([key, title, hint]) => (
            <Button type="button" variant="card" size="none" active={Boolean(settings[key])} className="min-h-14 w-full justify-between rounded-xl p-3 text-right" key={key} onClick={() => update({ [key]: !settings[key] })}>
              <span><b className="block text-sm text-slate-800 dark:text-slate-100">{title}</b><small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</small></span>
              <i className={cn('relative h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform dark:bg-slate-700', settings[key] ? 'bg-indigo-600 after:right-6' : 'after:right-1')} />
            </Button>
          ))}
          {settings.autoLogout && (
            <label className="mins-label">مدت زمان خروج خودکار
              <select value={settings.autoLogoutMins} onChange={e => update({ autoLogoutMins: Number(e.target.value) })}>
                {[5, 10, 15, 30, 60].map(m => <option key={m} value={m}>{m.toLocaleString('fa-IR')} دقیقه</option>)}
              </select>
            </label>
          )}
        </section>
      </div>
    </>
  )
}
