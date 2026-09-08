import { useMemo, useState } from 'react'
import { normalizeText, playChime } from '../../shared'
import { Avatar, Icon } from '../../shared-ui'
import type { Person, Activity, Note, ThemeMode } from '../../types'
import { Badge } from '../common/Badge'

interface CommandItem {
  id: string
  title: string
  subtitle: string
  icon: string
  category: 'فرمان‌های سریع' | 'پیمایش صفحات' | 'شخصی‌سازی و تم'
  keywords: string[]
  action: () => void
}

export function SearchModal({
  people,
  activities,
  notes,
  onClose,
  onPickPerson,
  onNavigate,
  onOpenCreatePerson,
  onOpenCreateTask,
  onChangeTheme,
  onExportData,
}: {
  people: Person[]
  activities: Activity[]
  notes: Note[]
  onClose: () => void
  onPickPerson: (p: Person) => void
  onNavigate?: (page: 'dashboard' | 'persons' | 'workflow' | 'activities' | 'users' | 'reports' | 'settings' | 'tasks') => void
  onOpenCreatePerson?: () => void
  onOpenCreateTask?: () => void
  onChangeTheme?: (theme: ThemeMode) => void
  onExportData?: () => void
}) {
  const [q, setQ] = useState('')
  const nq = normalizeText(q)

  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      {
        id: 'cmd-create-person',
        title: 'ثبت فرد جدید',
        subtitle: 'باز کردن فرم ثبت پرونده پرسنلی جدید',
        icon: '👤+',
        category: 'فرمان‌های سریع',
        keywords: ['ثبت', 'فرد', 'جدید', 'پرونده', 'افزودن', 'create', 'person', 'add'],
        action: () => {
          onClose()
          onOpenCreatePerson?.()
        },
      },
      {
        id: 'cmd-create-task',
        title: 'ایجاد کار جدید',
        subtitle: 'ایجاد تسک کاری در بخش مدیریت کارها',
        icon: '📝+',
        category: 'فرمان‌های سریع',
        keywords: ['کار', 'جدید', 'تسک', 'ایجاد', 'task', 'create'],
        action: () => {
          onClose()
          onOpenCreateTask?.()
        },
      },
      {
        id: 'cmd-export',
        title: 'خروجی اکسل از پرونده‌ها',
        subtitle: 'دریافت فایل داده‌های پرسنلی در قالب CSV/Excel',
        icon: '📊',
        category: 'فرمان‌های سریع',
        keywords: ['خروجی', 'اکسل', 'دانلود', 'csv', 'excel', 'export'],
        action: () => {
          onClose()
          onExportData?.()
        },
      },
      {
        id: 'cmd-nav-tasks',
        title: 'رفتن به مدیریت کارهای من',
        subtitle: 'مشاهده لیست تسک‌ها، کانبان و تایم‌لاین گانت',
        icon: '📋',
        category: 'پیمایش صفحات',
        keywords: ['کارها', 'کارهای من', 'تسک', 'کانبان', 'tasks', 'todo'],
        action: () => {
          onClose()
          onNavigate?.('tasks')
        },
      },
      {
        id: 'cmd-nav-persons',
        title: 'رفتن به لیست افراد و پرونده‌ها',
        subtitle: 'مدیریت و جستجوی جامع افراد',
        icon: '👥',
        category: 'پیمایش صفحات',
        keywords: ['افراد', 'پرسنل', 'پرونده', 'persons', 'people'],
        action: () => {
          onClose()
          onNavigate?.('persons')
        },
      },
      {
        id: 'cmd-nav-workflow',
        title: 'رفتن به برد گردش‌کار',
        subtitle: 'جابجایی پرونده‌ها بین مراحل گردش‌کار',
        icon: '🔄',
        category: 'پیمایش صفحات',
        keywords: ['گردش کار', 'مراحل', 'برد', 'workflow'],
        action: () => {
          onClose()
          onNavigate?.('workflow')
        },
      },
      {
        id: 'cmd-nav-reports',
        title: 'رفتن به گزارش‌ها و تحلیل عملکرد',
        subtitle: 'مشاهده نمودارهای تحلیلی و لاگ رویدادها',
        icon: '📈',
        category: 'پیمایش صفحات',
        keywords: ['گزارش', 'نمودار', 'تحلیل', 'audit', 'reports'],
        action: () => {
          onClose()
          onNavigate?.('reports')
        },
      },
      {
        id: 'cmd-theme-light',
        title: 'تغییر تم به حالت روشن (Light)',
        subtitle: 'قالب استاندارد روز با پس‌زمینه روشن',
        icon: '☀️',
        category: 'شخصی‌سازی و تم',
        keywords: ['تم', 'روشن', 'سفید', 'light', 'day'],
        action: () => {
          onClose()
          onChangeTheme?.('light')
        },
      },
      {
        id: 'cmd-theme-dark',
        title: 'تغییر تم به حالت تاریک (Dark)',
        subtitle: 'قالب تیره و ملایم برای شب',
        icon: '🌙',
        category: 'شخصی‌سازی و تم',
        keywords: ['تم', 'تاریک', 'تیره', 'شب', 'dark', 'night'],
        action: () => {
          onClose()
          onChangeTheme?.('dark')
        },
      },
      {
        id: 'cmd-theme-midnight',
        title: 'تغییر تم به سرمه‌ای سلطنتی (Midnight Navy)',
        subtitle: 'قالب اختصاصی با آبی تیره و جزئیات نئونی',
        icon: '🌌',
        category: 'شخصی‌سازی و تم',
        keywords: ['تم', 'سرمه ای', 'سرمه‌ای', 'midnight', 'navy', 'blue'],
        action: () => {
          onClose()
          onChangeTheme?.('midnight')
        },
      },
      {
        id: 'cmd-theme-emerald',
        title: 'تغییر تم به زمردی سازمانی (Emerald)',
        subtitle: 'قالب لوکس سبز تیره زمردی',
        icon: '🌲',
        category: 'شخصی‌سازی و تم',
        keywords: ['تم', 'سبز', 'زمردی', 'emerald', 'green'],
        action: () => {
          onClose()
          onChangeTheme?.('emerald')
        },
      },
      {
        id: 'cmd-theme-cobalt',
        title: 'تغییر تم به آبی کاربنی (Cobalt)',
        subtitle: 'قالب مدرن آبی کاربنی با کنتراست بالا',
        icon: '💎',
        category: 'شخصی‌سازی و تم',
        keywords: ['تم', 'کاربنی', 'نیلگون', 'cobalt'],
        action: () => {
          onClose()
          onChangeTheme?.('cobalt')
        },
      },
    ]
    return list
  }, [onClose, onOpenCreatePerson, onOpenCreateTask, onExportData, onNavigate, onChangeTheme])

  const matchedCommands = useMemo(() => {
    if (!nq) return commands.slice(0, 4)
    return commands.filter(c =>
      normalizeText(c.title).includes(nq) ||
      normalizeText(c.subtitle).includes(nq) ||
      c.keywords.some(k => normalizeText(k).includes(nq)),
    )
  }, [commands, nq])

  const matchedPeople = nq
    ? people
        .filter(p =>
          normalizeText(`${p.firstName} ${p.lastName} ${p.fatherName} ${p.nationalId} ${p.id}`).includes(nq),
        )
        .slice(0, 5)
    : []

  const matchedNotes = nq
    ? notes.filter(n => normalizeText(`${n.text} ${n.author} ${n.title}`).includes(nq)).slice(0, 3)
    : []

  const matchedActs = nq
    ? activities
        .filter(a =>
          normalizeText(`${a.action} ${a.personName} ${a.createdBy} ${a.rejectionReason ?? ''}`).includes(nq),
        )
        .slice(0, 3)
    : []

  const personOf = (id: string) => people.find(p => p.id === id)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      if (matchedCommands.length > 0 && (nq.startsWith('>') || matchedPeople.length === 0)) {
        playChime('click')
        matchedCommands[0].action()
      } else if (matchedPeople.length > 0) {
        onPickPerson(matchedPeople[0])
      } else if (matchedCommands.length > 0) {
        playChime('click')
        matchedCommands[0].action()
      }
    }
  }

  return (
    <div className="backdrop search-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="search-modal" onClick={e => e.stopPropagation()} dir="rtl">
        <div className="search-input-row">
          <Icon name="search" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="دستور یا جستجو را تایپ کنید (مثلاً: ثبت فرد، تم تاریک، کد ملی)..."
          />
          <kbd onClick={onClose} style={{ cursor: 'pointer' }}>
            Esc
          </kbd>
        </div>

        {/* Command section */}
        {matchedCommands.length > 0 && (
          <div className="search-section">
            <h5>⚡ دستورات و اقدامات سریع</h5>
            {matchedCommands.map(cmd => (
              <button
                key={cmd.id}
                type="button"
                className="search-hit cmd-hit"
                onClick={() => {
                  playChime('click')
                  cmd.action()
                }}
              >
                <span className="search-ico">{cmd.icon}</span>
                <span>
                  <b>{cmd.title}</b>
                  <small>{cmd.subtitle}</small>
                </span>
                <span className="cmd-badge">{cmd.category}</span>
              </button>
            ))}
          </div>
        )}

        {/* People search results */}
        {matchedPeople.length > 0 && (
          <div className="search-section">
            <h5>افراد و پرونده‌ها ({matchedPeople.length.toLocaleString('fa-IR')})</h5>
            {matchedPeople.map(p => (
              <button key={p.id} type="button" className="search-hit" onClick={() => onPickPerson(p)}>
                <Avatar text={p.firstName[0]} src={p.photo} size={28} />
                <span>
                  <b>
                    {p.firstName} {p.lastName}
                  </b>
                  <small>
                    {p.nationalId} · {p.id} · پدر: {p.fatherName}
                  </small>
                </span>
                <Badge status={p.status} />
              </button>
            ))}
          </div>
        )}

        {/* Notes */}
        {matchedNotes.length > 0 && (
          <div className="search-section">
            <h5>یادداشت‌ها ({matchedNotes.length.toLocaleString('fa-IR')})</h5>
            {matchedNotes.map(n => (
              <button
                key={n.id}
                type="button"
                className="search-hit"
                onClick={() => {
                  const p = personOf(n.personId)
                  if (p) onPickPerson(p)
                }}
              >
                <span className="search-ico">💬</span>
                <span>
                  <b>{n.author}</b>
                  <small>{n.text.length > 70 ? `${n.text.slice(0, 70)}…` : n.text}</small>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Activities */}
        {matchedActs.length > 0 && (
          <div className="search-section">
            <h5>رویدادها ({matchedActs.length.toLocaleString('fa-IR')})</h5>
            {matchedActs.map(a => (
              <button
                key={a.id}
                type="button"
                className="search-hit"
                onClick={() => {
                  const p = personOf(a.personId)
                  if (p) onPickPerson(p)
                }}
              >
                <span className="search-ico">↺</span>
                <span>
                  <b>{a.action}</b>
                  <small>
                    {a.personName} · {a.createdBy} · {a.createdAt}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}

        {nq &&
          matchedCommands.length === 0 &&
          matchedPeople.length === 0 &&
          matchedNotes.length === 0 &&
          matchedActs.length === 0 && (
            <div className="empty">موردی یافت نشد. می‌توانید با کلیدواژه‌های دیگری جستجو کنید.</div>
          )}
      </div>
    </div>
  )
}
