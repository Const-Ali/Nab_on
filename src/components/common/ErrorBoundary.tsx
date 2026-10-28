import React from 'react'

type Props = {
  children: React.ReactNode
  fallback?: React.ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Nab] ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="grid min-h-svh place-items-center bg-slate-50 p-6 dark:bg-slate-950" dir="rtl">
          <div className="max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center dark:border-rose-900/50 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-rose-700 dark:text-rose-300">خطای غیرمنتظره در سامانه</h2>
            <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
              بخشی از صفحه دچار مشکل شد. با تازه‌سازی صفحه یا بازگشت به داشبورد دوباره امتحان کنید. اگر تکرار شد، گزارش را به مدیر سامانه بدهید.
            </p>
            {this.state.error && (
              <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-slate-100 p-2 text-left text-[10px] leading-4 text-slate-600 dark:bg-slate-800 dark:text-slate-300" dir="ltr">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                تازه‌سازی صفحه
              </button>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                ادامه
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
