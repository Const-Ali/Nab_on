import ExcelJS from 'exceljs'
import type { PeopleImportRow, ServerPersonExportRow } from './types'

export interface ImportedExcelRow extends PeopleImportRow {
  excelRow: number
  cellErrors: string[]
}

const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const importHeaders = [
  'نام',
  'نام خانوادگی',
  'کد ملی',
  'تاریخ تولد شمسی',
  'نام پدر',
  'مهلت پیگیری شمسی',
  'نام کاربری ارجاع',
]

function saveWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  return workbook.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer as BlobPart], { type: xlsxMime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
  })
}

function styleHeader(worksheet: ExcelJS.Worksheet) {
  const header = worksheet.getRow(1)
  header.height = 28
  header.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF312E81' } } }
  })
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + header.cellCount)}1` }
}

export async function downloadPeopleImportTemplate() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'سامانه ناب'
  workbook.subject = 'قالب ورود گروهی پرونده‌ها'
  const worksheet = workbook.addWorksheet('ورود پرونده‌ها', { views: [{ rightToLeft: true }] })
  worksheet.columns = [
    { header: importHeaders[0], key: 'firstName', width: 20 },
    { header: importHeaders[1], key: 'lastName', width: 22 },
    { header: importHeaders[2], key: 'nationalId', width: 16, style: { numFmt: '@' } },
    { header: importHeaders[3], key: 'birthDate', width: 20, style: { numFmt: '@' } },
    { header: importHeaders[4], key: 'fatherName', width: 20 },
    { header: importHeaders[5], key: 'deadline', width: 20, style: { numFmt: '@' } },
    { header: importHeaders[6], key: 'assignee', width: 25 },
  ]
  styleHeader(worksheet)
  worksheet.getColumn(3).numFmt = '@'
  worksheet.getColumn(4).numFmt = '@'
  worksheet.getColumn(6).numFmt = '@'
  const help = workbook.addWorksheet('راهنما', { views: [{ rightToLeft: true }] })
  help.columns = [{ width: 30 }, { width: 100 }]
  help.addRows([
    ['راهنمای ورود پرونده‌ها'],
    ['منبع داده', 'برای دریافت فایل حاوی پرونده‌های واقعی، از دکمهٔ «دریافت Excel سرور» در صفحهٔ افراد استفاده کنید. این قالب فقط سرستون‌های لازم برای ثبت پرونده‌های تازه را دارد.'],
    ['ردیف‌ها', 'هر ردیف در برگهٔ «ورود پرونده‌ها» یک پروندهٔ تازه است؛ پرونده‌های موجود را دوباره وارد نکنید.'],
    ['فیلدهای ضروری', 'نام، نام خانوادگی، کد ملی ۱۰ رقمی و نام پدر. کد ملی باید معتبر و در سامانه/فایل تکراری نباشد.'],
    ['تاریخ‌ها', 'تاریخ تولد و مهلت پیگیری را به‌صورت متن شمسی با قالب ۱۴۰۵/۰۷/۲۹ وارد کنید؛ تاریخ تولد نباید در آینده باشد.'],
    ['مرحلهٔ پرونده', 'پرونده‌های واردشده از مرحلهٔ آغازین گردش‌کار فعلی شروع می‌شوند؛ مسیر گردش‌کار تغییر نمی‌کند.'],
    ['ارجاع', 'نام کاربری ارجاع اختیاری است و باید متعلق به حساب فعال سامانه باشد.'],
    ['ثبت نهایی', 'ابتدا پیش‌نمایش را بررسی کنید. تا زمانی که خطا یا کد ملی تکراری وجود دارد، ثبت گروهی فعال نمی‌شود. ثبت نهایی یک‌جا و روی سرور انجام می‌شود.'],
  ])
  help.getRow(1).font = { bold: true, size: 15, color: { argb: 'FF312E81' } }
  help.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 30 : 42
    row.eachCell(cell => { cell.alignment = { vertical: 'middle', wrapText: true } })
  })
  await saveWorkbook(workbook, 'قالب-ورود-گروهی-پرونده‌ها.xlsx')
}

export async function downloadServerPeopleXlsx(people: ServerPersonExportRow[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'سامانه ناب'
  workbook.subject = 'خروجی پرونده‌های فعلی سرور'
  const worksheet = workbook.addWorksheet('پرونده‌های سرور', { views: [{ rightToLeft: true }] })
  const headers = ['شناسه', 'نام', 'نام خانوادگی', 'کد ملی', 'تاریخ تولد شمسی', 'نام پدر', 'مرحله', 'مهلت پیگیری شمسی', 'نام کاربری ارجاع']
  worksheet.columns = [
    { header: headers[0], key: 'id', width: 20 },
    { header: headers[1], key: 'firstName', width: 20 },
    { header: headers[2], key: 'lastName', width: 22 },
    { header: headers[3], key: 'nationalId', width: 16, style: { numFmt: '@' } },
    { header: headers[4], key: 'birthDate', width: 20, style: { numFmt: '@' } },
    { header: headers[5], key: 'fatherName', width: 20 },
    { header: headers[6], key: 'status', width: 25 },
    { header: headers[7], key: 'deadline', width: 20, style: { numFmt: '@' } },
    { header: headers[8], key: 'assignee', width: 25 },
  ]
  for (const person of people) {
    worksheet.addRow({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      nationalId: String(person.nationalId ?? ''),
      birthDate: String(person.birthDate ?? ''),
      fatherName: person.fatherName,
      status: person.status,
      deadline: String(person.deadline ?? ''),
      assignee: String(person.assignee ?? ''),
    })
  }
  styleHeader(worksheet)
  for (const index of [4, 5, 8]) worksheet.getColumn(index).numFmt = '@'
  const created = new Date().toISOString().slice(0, 10)
  await saveWorkbook(workbook, `پرونده‌های-واقعی-سرور-${created}.xlsx`)
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('fa-IR').replace(/[\s\u200c_-]+/g, '')
}

const headerAliases: Record<keyof PeopleImportRow, string[]> = {
  firstName: ['نام', 'firstname', 'first name'],
  lastName: ['نامخانوادگی', 'نام خانوادگي', 'lastname', 'last name'],
  nationalId: ['کدملی', 'کدملی۱۰رقمی', 'nationalid', 'national id'],
  birthDate: ['تاریختولدشمسی', 'تاریختولد', 'birthdate', 'birth date'],
  fatherName: ['نامپدر', 'fathername', 'father name'],
  deadline: ['مهلتپیگیریشمسی', 'مهلتپیگیری', 'deadline', 'due date'],
  assignee: ['نامکاربریارجاع', 'ارجاعبه', 'مسئول', 'assignee', 'username'],
}

function cellValue(cell: ExcelJS.Cell, field: keyof PeopleImportRow): { value: string; error?: string } {
  const raw = cell.value
  if (raw === null || raw === undefined || raw === '') return { value: '' }
  if (raw instanceof Date) return { value: '', error: 'تاریخ را به‌صورت متن شمسی وارد کنید.' }
  if (typeof raw === 'number') {
    if (field === 'nationalId' && Number.isInteger(raw) && raw >= 0) return { value: String(raw).padStart(10, '0') }
    return { value: String(raw) }
  }
  if (typeof raw === 'object') {
    const value = raw as { formula?: unknown; sharedFormula?: unknown; text?: unknown; richText?: Array<{ text?: string }> }
    if (value.formula || value.sharedFormula) return { value: '', error: 'فرمول در فایل Excel مجاز نیست؛ مقدار نهایی را به‌صورت متن وارد کنید.' }
    if (Array.isArray(value.richText)) return { value: value.richText.map(part => part.text ?? '').join('').trim() }
    if (typeof value.text === 'string') return { value: value.text.trim() }
    return { value: '', error: 'نوع خانهٔ Excel پشتیبانی نمی‌شود؛ مقدار را به‌صورت متن ساده وارد کنید.' }
  }
  return { value: String(raw).trim() }
}

export async function readPeopleExcel(file: File): Promise<ImportedExcelRow[]> {
  if (!file.name.toLocaleLowerCase('en').endsWith('.xlsx')) throw new Error('فقط فایل Excel با پسوند .xlsx پذیرفته می‌شود.')
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error('حجم فایل باید کمتر از ۵ مگابایت باشد.')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const worksheet = workbook.worksheets.find(sheet => normalizeHeader(sheet.name).includes(normalizeHeader('ورودپرونده‌ها'))) ?? workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount < 2) throw new Error('برگهٔ Excel سرستون و دست‌کم یک ردیف داده ندارد.')

  const headers = new Map<string, number>()
  worksheet.getRow(1).eachCell((cell, columnNumber) => headers.set(normalizeHeader(cell.text || cell.value), columnNumber))
  const columns = {} as Record<keyof PeopleImportRow, number | undefined>
  for (const field of Object.keys(headerAliases) as (keyof PeopleImportRow)[]) {
    const aliases = new Set(headerAliases[field].map(normalizeHeader))
    columns[field] = [...headers.entries()].find(([header]) => aliases.has(header))?.[1]
  }
  for (const field of ['firstName', 'lastName', 'nationalId', 'fatherName'] as const) {
    if (!columns[field]) throw new Error(`ستون ضروری «${headerAliases[field][0]}» در ردیف اول پیدا نشد.`)
  }

  const rows: ImportedExcelRow[] = []
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const values = {} as PeopleImportRow
    const cellErrors: string[] = []
    for (const field of Object.keys(headerAliases) as (keyof PeopleImportRow)[]) {
      const column = columns[field]
      if (!column) { values[field] = ''; continue }
      const parsed = cellValue(row.getCell(column), field)
      values[field] = parsed.value
      if (parsed.error) cellErrors.push(`${headerAliases[field][0]}: ${parsed.error}`)
    }
    if (Object.values(values).every(value => !String(value ?? '').trim()) && cellErrors.length === 0) return
    rows.push({ ...values, excelRow: rowNumber, cellErrors })
  })
  if (rows.length === 0) throw new Error('هیچ ردیف پرونده‌ای برای پیش‌نمایش پیدا نشد.')
  if (rows.length > 2000) throw new Error('فایل بیش از سقف ۲۰۰۰ ردیف است؛ آن را به چند فایل کوچک‌تر تقسیم کنید.')
  return rows
}
