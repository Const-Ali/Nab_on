import { Button } from './Button'
import { useEffect, useRef, useState } from 'react'
import { playChime, sendBrowserNotification, toPersianDigits } from '../../shared'
import './pomodoro.css'

interface Props {
  taskId?: string
  taskTitle?: string
  onTimeLogged?: (minutes: number, taskId?: string) => void
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

export function PomodoroTimer({ taskId, taskTitle, onTimeLogged, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('pomodoro')
  const [timeLeft, setTimeLeft] = useState(MODE_TIMES.pomodoro)
  const [isRunning, setIsRunning] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)

  const deadlineRef = useRef<number | null>(null)
  const modeRef = useRef<Mode>(mode)
  const taskIdRef = useRef<string | undefined>(taskId)
  const sessionTaskIdRef = useRef<string | undefined>(taskId)
  const onTimeLoggedRef = useRef(onTimeLogged)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { onTimeLoggedRef.current = onTimeLogged }, [onTimeLogged])
  useEffect(() => { taskIdRef.current = taskId }, [taskId])

  // When the bound task changes while timer is running, reset to avoid crediting the wrong task.
  // This matches the expected UX: switching the detail view should not silently reassign the running session.
  useEffect(() => {
    if (!taskId) return
    // Only reset if taskId actually changed and we had a previous session
    if (sessionTaskIdRef.current && sessionTaskIdRef.current !== taskId) {
      // If timer is running, pause and reset so the new task gets a fresh session
      if (isRunning) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsRunning(false)
        deadlineRef.current = null
        setTimeLeft(MODE_TIMES[modeRef.current])
      }
      sessionTaskIdRef.current = taskId
    } else if (!sessionTaskIdRef.current && taskId) {
      sessionTaskIdRef.current = taskId
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  // Keep sessionTaskId in sync when timer starts
  useEffect(() => {
    if (isRunning) {
      sessionTaskIdRef.current = taskIdRef.current
    }
  }, [isRunning])

  // Persist pomodoro across tab close/refresh — survives accidental close
  const POMO_KEY = 'nab:pomo:state'
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POMO_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { deadline: number; mode: Mode; timeLeft: number; taskId?: string; completedSessions?: number }
      if (!saved.deadline || !saved.mode || typeof saved.timeLeft !== 'number') return
      const remaining = Math.max(0, Math.round((saved.deadline - Date.now()) / 1000))
      if (remaining > 0 && saved.deadline > Date.now() && saved.mode in MODE_TIMES) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMode(saved.mode)
        modeRef.current = saved.mode
        setTimeLeft(remaining)
        setIsRunning(true)
        deadlineRef.current = saved.deadline
        if (saved.taskId) {
          taskIdRef.current = saved.taskId
          sessionTaskIdRef.current = saved.taskId
        }
        if (typeof saved.completedSessions === 'number') setCompletedSessions(saved.completedSessions)
      } else {
        localStorage.removeItem(POMO_KEY)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      if (isRunning && deadlineRef.current) {
        localStorage.setItem(POMO_KEY, JSON.stringify({ deadline: deadlineRef.current, mode: modeRef.current, timeLeft, taskId: taskIdRef.current, completedSessions }))
      } else if (!isRunning && timeLeft === MODE_TIMES[modeRef.current]) {
        // Keep completedSessions but clear deadline when reset to full
        const raw = localStorage.getItem(POMO_KEY)
        if (raw) {
          try {
            const saved = JSON.parse(raw) as { completedSessions?: number }
            localStorage.setItem(POMO_KEY, JSON.stringify({ deadline: null, mode: modeRef.current, timeLeft, taskId: taskIdRef.current, completedSessions: saved.completedSessions ?? completedSessions }))
          } catch { localStorage.removeItem(POMO_KEY) }
        }
      }
    } catch {
      // ignore
    }
  }, [isRunning, timeLeft, mode, completedSessions])

  useEffect(() => {
    if (!isRunning) {
      deadlineRef.current = null
      return
    }
    // Set deadline based on current wall-clock time and remaining seconds
    deadlineRef.current = Date.now() + timeLeft * 1000

    const handleTick = () => {
      if (deadlineRef.current === null) return
      const remaining = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000))
      if (remaining <= 0) {
        // Session completed
        playChime('timer_done')
        const currentMode = modeRef.current
        const msg =
          currentMode === 'pomodoro'
            ? 'زمان تمرکز ۲۵ دقیقه‌ای تمام شد! وقت استراحت است.'
            : 'استراحت تمام شد! آماده تمرکز مجدد هستید؟'
        sendBrowserNotification('تایمر پومودورو ناب', { body: msg })
        if (currentMode === 'pomodoro') {
          setCompletedSessions(s => s + 1)
          // Credit the task that was active when this pomodoro session started, not the currently selected one
          const creditedTaskId = sessionTaskIdRef.current
          onTimeLoggedRef.current?.(25, creditedTaskId)
          const nextMode: Mode = 'shortBreak'
          modeRef.current = nextMode
          setMode(nextMode)
          setTimeLeft(MODE_TIMES[nextMode])
          deadlineRef.current = Date.now() + MODE_TIMES[nextMode] * 1000
        } else {
          const nextMode: Mode = 'pomodoro'
          modeRef.current = nextMode
          setMode(nextMode)
          setTimeLeft(MODE_TIMES[nextMode])
          deadlineRef.current = Date.now() + MODE_TIMES[nextMode] * 1000
        }
      } else {
        setTimeLeft(remaining)
      }
    }

    const interval = window.setInterval(handleTick, 250)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleTick()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isRunning, timeLeft])

  // When paused, deadline is cleared; on resume the effect above will recalc based on timeLeft
  // Ensure mode time stays in sync when user manually changes mode
  const changeMode = (m: Mode) => {
    setMode(m)
    modeRef.current = m
    setTimeLeft(MODE_TIMES[m])
    setIsRunning(false)
    deadlineRef.current = null
    // Update session task to current task when mode changes (fresh session)
    sessionTaskIdRef.current = taskIdRef.current
  }

  const toggleRun = () => {
    playChime('click')
    if (!isRunning) {
      // Starting: capture current task
      sessionTaskIdRef.current = taskIdRef.current
    }
    setIsRunning(r => !r)
  }

  const reset = () => {
    setIsRunning(false)
    deadlineRef.current = null
    setTimeLeft(MODE_TIMES[modeRef.current])
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const progress = ((MODE_TIMES[mode] - timeLeft) / MODE_TIMES[mode]) * 100

  if (minimized) {
    return (
      <Button
        variant="soft"
        size="sm"
        className="pomo-floating-pill"
        onClick={() => setMinimized(false)}
        title="باز کردن تایمر پومودورو"
        aria-label={`باز کردن تایمر پومودورو، ${toPersianDigits(timeStr)} باقی‌مانده`}
      >
        <span className={`pomo-pulse ${isRunning ? 'active' : ''}`} aria-hidden="true" />
        <span className="pomo-time-pill">{toPersianDigits(timeStr)}</span>
        <small>{mode === 'pomodoro' ? 'تمرکز' : 'استراحت'}</small>
      </Button>
    )
  }

  return (
    <div className="pomo-widget" dir="rtl">
      <div className="pomo-header">
        <div className="pomo-title">
          <div>
            <b>تایمر پومودورو و تمرکز</b>
            {taskTitle && <small title={taskTitle}>کار: {taskTitle.length > 25 ? `${taskTitle.slice(0, 25)}…` : taskTitle}</small>}
          </div>
        </div>
        <div className="pomo-head-actions">
          <Button variant="ghost" size="xs" onClick={() => setMinimized(true)} title="کوچک‌نمایی" aria-label="کوچک‌نمایی">
            کوچک‌نمایی
          </Button>
          {onClose && (
            <Button variant="ghost" size="xs" onClick={onClose} title="بستن تایمر" aria-label="بستن تایمر">
              بستن
            </Button>
          )}
        </div>
      </div>

      <div className="pomo-modes" role="group" aria-label="حالت تایمر">
        {(['pomodoro', 'shortBreak', 'longBreak'] as Mode[]).map(m => (
          <Button
            key={m}
            variant="tab"
            size="xs"
            active={mode === m}
            onClick={() => changeMode(m)}
          >
            {m === 'pomodoro' ? 'تمرکز (۲۵ دقیقه)' : m === 'shortBreak' ? 'استراحت (۵ دقیقه)' : 'استراحت طولانی (۱۵)'}
          </Button>
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
        <Button variant={isRunning ? 'outline' : 'primary'} size="md" onClick={toggleRun}>
          {isRunning ? 'توقف موقت' : 'شروع تمرکز'}
        </Button>
        <Button variant="outline" size="sm" onClick={reset} title="شروع مجدد" aria-label="شروع مجدد">
          شروع مجدد
        </Button>
      </div>

      <div className="pomo-footer">
        <span>دوره‌های تمرکز تکمیل‌شده: <b>{toPersianDigits(completedSessions)}</b></span>
        {completedSessions > 0 && <span>زمان کل: <b>{toPersianDigits(completedSessions * 25)} دقیقه</b></span>}
      </div>
    </div>
  )
}
