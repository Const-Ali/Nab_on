export const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const nowStamp = () =>
  `${new Date().toLocaleDateString('fa-IR')} · ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`

export const nowTs = () => Date.now()

export const normalizeDigits = (value: string) => value.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))

export const normalizeText = (value: string) => normalizeDigits(value.trim()).replace(/ي/g, 'ی').replace(/ك/g, 'ک')

export const toPersianDigits = (value: string | number) =>
  String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

export const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota/denied */
  }
}

export const jalaliMonthNames = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

export const jalaliToday = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .map(p => [p.type, p.value]),
  )
  return `${parts.year}/${parts.month}/${parts.day}`
}

const faDtf = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const jalaliParts = (date: Date) => {
  const parts = Object.fromEntries(faDtf.formatToParts(date).map(p => [p.type, p.value]))
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) }
}

export const jalaliJdn = (y: number, m: number, d: number) => {
  const epbase = y - (y >= 0 ? 474 : 473)
  const epyear = 474 + (((epbase % 2820) + 2820) % 2820)
  return (
    d +
    (m <= 7 ? (m - 1) * 31 : (m - 1) * 30 + 6) +
    Math.floor((epyear * 682 - 110) / 2816) +
    (epyear - 1) * 365 +
    Math.floor(epbase / 2820) * 1029983 +
    1948320
  )
}

export const jdnToDate = (jdn: number): Date => new Date((jdn - 2440588) * 86400000 + 12 * 3600000)

/**
 * پخش افکت‌های صوتی دلنشین بدون وابستگی فایل خارجی (با Web Audio API)
 */
export function playChime(type: 'complete' | 'success' | 'alert' | 'timer_done' | 'click' = 'complete') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
    const now = ctx.currentTime

    if (type === 'complete' || type === 'success') {
      // آکورد هارمونیک سه‌گانه گوش‌نواز (C5 -> E5 -> G5)
      const freqs = [523.25, 659.25, 783.99]
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(f, now + i * 0.07)
        gain.gain.setValueAtTime(0, now + i * 0.07)
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.07 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.38)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + i * 0.07)
        osc.stop(now + i * 0.07 + 0.4)
      })
    } else if (type === 'timer_done') {
      // زنگ پومودورو
      const freqs = [880, 1174.66, 1760]
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(f, now + i * 0.1)
        gain.gain.setValueAtTime(0, now + i * 0.1)
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.6)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + i * 0.1)
        osc.stop(now + i * 0.1 + 0.62)
      })
    } else if (type === 'alert') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.setValueAtTime(330, now + 0.1)
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.3)
    } else if (type === 'click') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, now)
      gain.gain.setValueAtTime(0.04, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.06)
    }
  } catch {
    // fallback if Web Audio is unavailable
  }
}

/**
 * ارسال اعلان مرورگر به کاربر
 */
export async function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') {
    new Notification(title, { icon: '/favicon.svg', ...options })
    return true
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      new Notification(title, { icon: '/favicon.svg', ...options })
      return true
    }
  }
  return false
}
