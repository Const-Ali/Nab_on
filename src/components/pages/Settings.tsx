import { useState } from 'react'
import { load, save } from '../../shared'
import { Heading } from '../../shared-ui'
import { defaultSettings, fontOptions, fontStacks } from '../../app-lib'
import type { AppSettings } from '../../types'

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
      <div className="grid2">
        <section className="panel settings">
          <h2>تنظیمات عمومی</h2><p>اطلاعات پایه سامانه</p>
          <label>نام سامانه<input value={settings.appName} onChange={e => update({ appName: e.target.value })} /></label>
          <label>منطقه زمانی<select defaultValue="tehran"><option value="tehran">Asia/Tehran (UTC+۳:۳۰)</option></select></label>
          <label>فونت سامانه
            <select value={settings.font} onChange={e => update({ font: e.target.value as AppSettings['font'] })}>
              {fontOptions.map(f => <option key={f.key} value={f.key} style={{ fontFamily: fontStacks[f.key] }}>{f.label} · {f.hint}</option>)}
            </select>
          </label>
          <button className="primary" onClick={() => { save('nab:settings', settings); onSaved() }}>ذخیره تغییرات</button>
        </section>
        <section className="panel settings">
          <h2>امنیت و نشست</h2><p>کنترل دسترسی و ورود کاربران</p>
          {toggles.map(([key, title, hint]) => (
            <button type="button" className="toggle-row" key={key} onClick={() => update({ [key]: !settings[key] })}>
              <span><b>{title}</b><small>{hint}</small></span>
              <i className={settings[key] ? 'on' : ''} />
            </button>
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
