import { useEffect, useState } from 'react'
import { playChime, sendBrowserNotification, toPersianDigits } from '../../shared'

interface Props {
  taskTitle?: string
  onTimeLogged?: (minutes: number) => void
  onClose?: () => void
}

type Mode = 'pomodoro' | 'shortBreak' | 'longBreak'

const MODE_TIMES: Record<Mode, number> = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

const MODE_LABELS: Record<Mode, string> = {
  pomodoro: 'تمرکز کاری (پومودورو)',
  shortBreak: 'استراحت کوتاه',
  longBreak: 'استراحت طولانی',
}

export function PomodoroTimer({ taskTitle, onTimeLogged, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('pomodoro')
  const [timeLeft, setTimeLeft] = useState(MODE_TIMES.pomodoro)
  const [isRunning, setIsRunning] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            playChime('timer_done')
            const msg =
              mode === 'pomodoro'
                ? 'زمان تمرکز ۲۵ دقیقه‌ای تمام شد! وقت استراحت است.'
                : 'استراحت تمام شد! آماده تمرکز مجدد هستید؟'
            sendBrowserNotification('تایمر پومودورو ناب', { body: msg })
            if (mode === 'pomodoro') {
              setCompletedSessions(s => s + 1)
              onTimeLogged?.(25)
              setMode('shortBreak')
              return MODE_TIMES.shortBreak
            } else {
              setMode('pomodoro')
              return MODE_TIMES.pomodoro
            }
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, mode, onTimeLogged])

  const changeMode = (m: Mode) => {
    setMode(m)
    setTimeLeft(MODE_TIMES[m])
    setIsRunning(false)
  }

  const toggleRun = () => {
    playChime('click')
    setIsRunning(r => !r)
  }

  const reset = () => {
    setIsRunning(false)
    setTimeLeft(MODE_TIMES[mode])
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const progress = ((MODE_TIMES[mode] - timeLeft) / MODE_TIMES[mode]) * 100

  if (minimized) {
    return (
      <div className="pomo-floating-pill" onClick={() => setMinimized(false)} title="کلیک جهت باز کردن تایمر پومودورو">
        <span className={`pomo-pulse ${isRunning ? 'active' : ''}`} />
        <span className="pomo-time-pill">{toPersianDigits(timeStr)}</span>
        <small>{mode === 'pomodoro' ? 'تمرکز' : 'استراحت'}</small>
      </div>
    )
  }

  return (
    <div className="pomo-widget" dir="rtl">
      <div className="pomo-header">
        <div className="pomo-title">
          <span className="pomo-icon">🍅</span>
          <div>
            <b>تایمر پومودورو و تمرکز</b>
            {taskTitle && <small title={taskTitle}>کار: {taskTitle.length > 25 ? `${taskTitle.slice(0, 25)}…` : taskTitle}</small>}
          </div>
        </div>
        <div className="pomo-head-actions">
          <button type="button" className="pomo-min-btn" onClick={() => setMinimized(true)} title="کوچک‌نمایی">
            —
          </button>
          {onClose && (
            <button type="button" className="pomo-min-btn" onClick={onClose} title="بستن">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="pomo-modes">
        {(['pomodoro', 'shortBreak', 'longBreak'] as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            className={`pomo-mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => changeMode(m)}
          >
            {m === 'pomodoro' ? 'تمرکز (۲۵ دقیقه)' : m === 'shortBreak' ? 'استراحت (۵ دقیقه)' : 'استراحت طولانی (۱۵)'}
          </button>
        ))}
      </div>

      <div className="pomo-clock-container">
        <div className="pomo-circle">
          <svg viewBox="0 0 120 120" className="pomo-svg">
            <circle cx="60" cy="60" r="54" className="pomo-bg-ring" />
            <circle
              cx="60"
              cy="60"
              r="54"
              className="pomo-progress-ring"
              style={{
                strokeDasharray: 339.29,
                strokeDashoffset: 339.29 - (339.29 * progress) / 100,
              }}
            />
          </svg>
          <div className="pomo-clock-text">
            <h2>{toPersianDigits(timeStr)}</h2>
            <small>{MODE_LABELS[mode]}</small>
          </div>
        </div>
      </div>

      <div className="pomo-controls">
        <button
          type="button"
          className={`pomo-start-btn ${isRunning ? 'pause' : 'start'}`}
          onClick={toggleRun}
        >
          {isRunning ? 'توقف موقت ⏸' : 'شروع تمرکز ▶'}
        </button>
        <button type="button" className="pomo-reset-btn" onClick={reset} title="شروع مجدد">
          ↺
        </button>
      </div>

      <div className="pomo-footer">
        <span>دوره‌های تمرکز تکمیل‌شده: <b>{toPersianDigits(completedSessions)}</b></span>
        {completedSessions > 0 && <span>زمان کل: <b>{toPersianDigits(completedSessions * 25)} دقیقه</b></span>}
      </div>
    </div>
  )
}
