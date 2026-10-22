import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../common/Button";
import { ThemeToggle } from "../common/ThemeToggle";
import { PasswordField } from "../common/PasswordField";
import type { ThemeMode } from "../../types";
import { errorBox, inputCls, labelCls } from "../ui";
export function Login({
  onLogin,
  onShowSetup,
  showSetup,
  serverMessage,
  theme,
  onToggleTheme,
}: {
  onLogin: (
    username: string,
    password: string,
    remember: boolean,
  ) => Promise<void>;
  onShowSetup: () => void;
  showSetup: boolean;
  serverMessage?: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("نام کاربری و رمز عبور الزامی هستند.");
      return;
    }
    setLoading(true);
    try {
      await onLogin(username.trim().toLowerCase(), password, remember);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ورود انجام نشد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-safe-shell relative grid min-h-svh bg-slate-50 lg:grid-cols-2 dark:bg-slate-950"
      dir="rtl"
    >
      <ThemeToggle
        theme={theme}
        onToggle={onToggleTheme}
        className="auth-safe-toggle absolute z-20"
      />
      <section className="hidden flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500 text-xl font-black shadow-lg shadow-indigo-500/25">
          ن
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            مدیریت هوشمند
            <br />
            <i className="font-normal text-indigo-300">پرونده‌های سازمانی</i>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
            ورود امن به سامانهٔ مدیریت پرونده‌ها و کارهای سازمانی.
          </p>
          <div className="mt-8 flex flex-col gap-3 text-sm text-slate-200">
            <span>مهر 1405</span>
            <span>علی محمدی</span>
          </div>
        </div>
      </section>
      <main className="flex items-center justify-center p-5 sm:p-8">
        <form
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
          onSubmit={submit}
        >
          <div className="mb-8">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-lg font-black text-white lg:hidden">
              ن
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              خوش آمدید
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              برای ورود به سامانه اطلاعات حساب خود را وارد کنید.
            </p>
          </div>
          {serverMessage && (
            <div className={`${errorBox} mb-4`} role="status">
              {serverMessage}
            </div>
          )}
          <label className={labelCls} htmlFor="login-username">
            نام کاربری
            <input
              id="login-username"
              className={inputCls}
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError("");
              }}
              autoComplete="username"
              required
            />
          </label>
          <div className={`${labelCls} mt-4`}>
            <label htmlFor="login-password">رمز عبور</label>
            <PasswordField
              id="login-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              autoComplete="current-password"
              dir="ltr"
              required
            />
          </div>
          {error && (
            <div
              className={`${errorBox} mt-4`}
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}
          <div className="mt-5 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <input
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />{" "}
              مرا به خاطر بسپار
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              برای بازیابی رمز با علی محمدی تماس بگیرید.
            </span>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="mt-6 w-full"
            loading={loading}
            loadingText="در حال بررسی..."
          >
            ورود به سامانه
          </Button>
          {showSetup && (
            <button
              type="button"
              className="mt-4 w-full rounded-xl px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
              onClick={onShowSetup}
            >
              راه‌اندازی اولیهٔ مدیر
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
