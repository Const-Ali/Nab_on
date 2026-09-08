export const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const nowStamp = () => `${new Date().toLocaleDateString('fa-IR')} · ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`

export const nowTs = () => Date.now()

export const normalizeDigits = (value: string) => value.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))

export const normalizeText = (value: string) => normalizeDigits(value.trim()).replace(/ي/g, 'ی').replace(/ك/g, 'ک')

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

export const jalaliMonthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

export const jalaliToday = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(p => [p.type, p.value]))
  return `${parts.year}/${parts.month}/${parts.day}`
}

const faDtf = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' })

export const jalaliParts = (date: Date) => {
  const parts = Object.fromEntries(faDtf.formatToParts(date).map(p => [p.type, p.value]))
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) }
}

export const jalaliJdn = (y: number, m: number, d: number) => {
  const epbase = y - (y >= 0 ? 474 : 473)
  const epyear = 474 + (((epbase % 2820) + 2820) % 2820)
  return d + (m <= 7 ? (m - 1) * 31 : (m - 1) * 30 + 6) + Math.floor((epyear * 682 - 110) / 2816) + (epyear - 1) * 365 + Math.floor(epbase / 2820) * 1029983 + 1948320
}

export const jdnToDate = (jdn: number): Date => new Date((jdn - 2440588) * 86400000 + 12 * 3600000)
