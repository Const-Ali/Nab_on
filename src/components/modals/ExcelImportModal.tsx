import { useEffect, useRef, useState } from 'react'
import { fetchPeopleImportSnapshot } from '../../api-client'
import { Button } from '../common/Button'
import { validBirthDate, validDeadlineDate, validNationalId } from '../../app-lib'
import { normalizeDigits } from '../../shared'
import type { PeopleImportRow } from '../../types'
import type { WorkflowConfig } from '../../workflow'
import type { ImportedExcelRow } from '../../excel'
import { backdropCls, cn, modalBox } from '../ui'

interface PreviewRow extends ImportedExcelRow {
  errors: string[]
  normalized: PeopleImportRow
}

export function ExcelImportModal({ workflowConfig, onClose, onImport }: {
  workflowConfig: WorkflowConfig
  onClose: () => void
  onImport: (rows: PeopleImportRow[]) => Promise<void>
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [serverRecordCount, setServerRecordCount] = useState(0)
  const [serverDataReady, setServerDataReady] = useState(false)
  const [serverLoading, setServerLoading] = useState(true)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const invalidCount = previewRows.filter(row => row.errors.length > 0).length
  const validCount = previewRows.length - invalidCount

  useEffect(() => {
    let active = true
    void fetchPeopleImportSnapshot().then(data => {
      if (!active) return
      setServerRecordCount(data.count)
      setServerDataReady(true)
      setError('')
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'دریافت پرونده‌های واقعی سرور ناموفق بود.')
    }).finally(() => {
      if (active) setServerLoading(false)
    })
    return () => { active = false }
  }, [])

  const preview = (rows: ImportedExcelRow[], knownNationalIds: string[], knownUsernames: string[], canAssign: boolean) => {
    const existingIds = new Set(knownNationalIds.map(nationalId => normalizeDigits(nationalId.trim())))
    const activeUserSet = new Set(knownUsernames.map(username => username.trim().toLowerCase()))
    const countByNationalId = new Map<string, number>()
    for (const row of rows) {
      const nationalId = normalizeDigits(row.nationalId.trim())
      if (nationalId) countByNationalId.set(nationalId, (countByNationalId.get(nationalId) ?? 0) + 1)
    }
    return rows.map(row => {
      const errors = [...row.cellErrors]
      const firstName = row.firstName.trim()
      const lastName = row.lastName.trim()
      const fatherName = row.fatherName.trim()
      const nationalId = normalizeDigits(row.nationalId.trim())
      const birthDate = normalizeDigits(row.birthDate.trim())
      const deadline = normalizeDigits(row.deadline.trim())
      const assignee = row.assignee.trim().toLowerCase()
      if (!firstName || !lastName || !fatherName) errors.push('نام، نام خانوادگی و نام پدر الزامی‌اند.')
      if (firstName.length > 100 || lastName.length > 100 || fatherName.length > 100) errors.push('طول هر نام حداکثر ۱۰۰ نویسه است.')
      if (!validNationalId(nationalId)) errors.push('کد ملی ۱۰ رقمی معتبر نیست.')
      else if (existingIds.has(nationalId)) errors.push('این کد ملی از قبل در پرونده‌های سرور ثبت شده است.')
      else if ((countByNationalId.get(nationalId) ?? 0) > 1) errors.push('این کد ملی در خود فایل Excel تکراری است.')
      if (birthDate && !validBirthDate(birthDate)) errors.push('تاریخ تولد شمسی معتبر نیست یا در آینده است.')
      if (deadline && deadline !== '—' && !validDeadlineDate(deadline)) errors.push('مهلت پیگیری شمسی معتبر نیست.')
      if (assignee && !canAssign) errors.push('برای ارجاع پرونده هنگام ورود، مجوز تغییر مرحله لازم است.')
      else if (assignee && !activeUserSet.has(assignee)) errors.push('نام کاربری ارجاع در فهرست کاربران فعال سرور نیست.')
      const normalized: PeopleImportRow = {
        firstName,
        lastName,
        nationalId,
        birthDate: birthDate || '—',
        fatherName,
        deadline: deadline === '—' ? '' : deadline,
        assignee,
      }
      return { ...row, errors, normalized }
    })
  }

  const selectFile = async (file?: File) => {
    if (!file) return
    setLoading(true)
    setError('')
    setPreviewRows([])
    setFileName(file.name)
    try {
      const [{ readPeopleExcel }, serverData] = await Promise.all([
        import('../../excel'),
        fetchPeopleImportSnapshot(),
      ])
      const rows = await readPeopleExcel(file)
      setServerRecordCount(serverData.count)
      setServerDataReady(true)
      setPreviewRows(preview(rows, serverData.nationalIds, serverData.activeUsernames, serverData.canAssign))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'خواندن فایل Excel ناموفق بود.')
      setFileName('')
    } finally {
      setLoading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const downloadTemplate = async () => {
    setError('')
    try {
      const { downloadPeopleImportTemplate } = await import('../../excel')
      await downloadPeopleImportTemplate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ساخت قالب Excel ناموفق بود.')
    }
  }

  const confirmImport = async () => {
    if (!previewRows.length || invalidCount > 0 || saving) return
    setSaving(true)
    setError('')
    try {
      await onImport(previewRows.map(row => row.normalized))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت گروهی روی سرور ناموفق بود؛ هیچ ردیفی ثبت نشد.')
      setSaving(false)
    }
  }

  return (
    <div className={backdropCls} onClick={event => { if (event.target === event.currentTarget && !saving) onClose() }}>
      <section className={cn(modalBox, 'max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom))] w-full max-w-5xl overflow-hidden p-0 sm:max-h-[calc(100vh-2rem)]')} role="dialog" aria-modal="true" aria-labelledby="excel-import-title" dir="rtl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-5 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id="excel-import-title" className="text-lg font-bold text-slate-950 dark:text-white">ورود گروهی پرونده‌ها از Excel</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">اطلاعات به‌صورت واقعی از سرور خوانده و پیش از ثبت با پرونده‌های موجود تطبیق داده می‌شود.</p>
          </div>
          <Button type="button" variant="ghost" size="xs" disabled={saving} onClick={onClose} aria-label="بستن">بستن</Button>
        </header>

        <div className="max-h-[calc(100dvh-12rem)] space-y-4 overflow-y-auto p-4 sm:max-h-[calc(100vh-13rem)] sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25">
              <b className="text-sm text-indigo-950 dark:text-indigo-100">۱. قالب خالی برای پرونده‌های تازه</b>
              <p className="mt-1 text-xs leading-5 text-indigo-900/80 dark:text-indigo-200">قالب دارای سرستون‌های رسمی و راهنمای تکمیل است؛ دادهٔ نمونهٔ ساختگی ندارد.</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void downloadTemplate()}>دانلود قالب Excel</Button>
            </section>
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/25">
              <b className="text-sm text-emerald-950 dark:text-emerald-100">۲. پرونده‌های واقعی سرور</b>
              <p className="mt-1 text-xs leading-5 text-emerald-900/80 dark:text-emerald-200">برای گرفتن فایل پرونده‌های فعلی، از دکمهٔ «دریافت Excel سرور» در صفحهٔ افراد استفاده کنید. پرونده‌های موجود را دوباره وارد نکنید.</p>
              <p className="mt-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">تعداد پرونده‌های سرور: {serverLoading ? 'در حال دریافت…' : serverDataReady ? serverRecordCount.toLocaleString('fa-IR') : 'دریافت نشده'}</p>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">پیش‌نمایش فایل برای تأیید ورود</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">کد ملی‌های نامعتبر/تکراری، تاریخ‌های اشتباه و ارجاع به کاربر غیرفعال پیش از ثبت مشخص می‌شوند. ثبت یک‌جا انجام می‌شود.</p>
              </div>
              <div>
                <input ref={fileInput} className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => { void selectFile(event.target.files?.[0]) }} aria-label="انتخاب فایل Excel" />
                <Button type="button" variant="primary" size="sm" loading={loading} loadingText="در حال خواندن فایل…" onClick={() => fileInput.current?.click()}>انتخاب فایل .xlsx</Button>
              </div>
            </div>
            {fileName && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">فایل انتخاب‌شده: <b dir="ltr">{fileName}</b></p>}
          </section>

          {previewRows.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                <b className="text-sm text-slate-900 dark:text-white">پیش‌نمایش همهٔ {previewRows.length.toLocaleString('fa-IR')} ردیف</b>
                <span className="text-xs"><strong className="text-emerald-700 dark:text-emerald-300">{validCount.toLocaleString('fa-IR')} آماده</strong><span className="mx-2 text-slate-300">·</span><strong className={invalidCount ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500'}>{invalidCount.toLocaleString('fa-IR')} دارای خطا</strong></span>
              </div>
              <div className="max-h-72 overflow-auto">
                <table className="w-full min-w-[42rem] text-right text-xs">
                  <thead className="sticky top-0 bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <tr><th className="px-3 py-2">ردیف</th><th className="px-3 py-2">نام</th><th className="px-3 py-2">کد ملی</th><th className="px-3 py-2">نتیجهٔ بررسی</th></tr>
                  </thead>
                  <tbody>
                    {previewRows.map(row => (
                      <tr key={row.excelRow} className="border-t border-slate-100 align-top dark:border-slate-800">
                        <td className="px-3 py-2 text-slate-500">{row.excelRow.toLocaleString('fa-IR')}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{row.firstName} {row.lastName}</td>
                        <td className="px-3 py-2 font-mono" dir="ltr">{row.nationalId || '—'}</td>
                        <td className="px-3 py-2">
                          {row.errors.length ? <ul className="space-y-1 text-rose-700 dark:text-rose-300">{row.errors.map((issue, index) => <li key={`${row.excelRow}-${index}`}>• {issue}</li>)}</ul> : <span className="font-semibold text-emerald-700 dark:text-emerald-300">آمادهٔ ثبت در سرور</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200" role="alert" aria-live="assertive">{error}</div>}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <small className="text-xs leading-5 text-slate-500 dark:text-slate-400">{workflowConfig.stages.find(stage => stage.id === workflowConfig.startStageId)?.label ?? 'مرحلهٔ آغازین'} · پیش‌نمایش تا زمان تأیید هیچ داده‌ای را ثبت نمی‌کند.</small>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>لغو</Button>
            <Button type="button" variant="primary" disabled={saving || loading || !previewRows.length || invalidCount > 0} loading={saving} loadingText="در حال ثبت روی سرور…" onClick={() => void confirmImport()}>
              تأیید و ثبت {validCount.toLocaleString('fa-IR')} پرونده
            </Button>
          </div>
        </footer>
      </section>
    </div>
  )
}
