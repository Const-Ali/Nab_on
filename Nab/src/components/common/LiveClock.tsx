import { useEffect, useState } from 'react'

export function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return <time className="text-[11px] font-bold tracking-[.5px] text-pri [font-variant-numeric:tabular-nums]">{now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
}
