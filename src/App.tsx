import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'

type Status =
  | 'درخواست پرونده'
  | 'پرونده پرسنلی'
  | 'کارت عادی'
  | 'سه‌برگی عادی'
  | 'تکمیل اطلاعات'
  | 'پرونده فعال'
  | 'ارسال به مرکز'
  | 'بررسی مرکز'
  | 'تأیید شده'
  | 'رد شده'
  | 'ارسال به شرکت'
  | 'پایان کار'

type Page = 'dashboard' | 'persons' | 'workflow' | 'activities' | 'users' | 'reports' | 'settings'

type Person = {
  id: string
  firstName: string
  lastName: string
  nationalId: string
  birthDate: string
  fatherName: string
  status: Status
  updatedAt: string
  updatedBy: string
}

type ActivityLog = {
  id: string
  personId: string
  personName: string
  action: string
  previousStatus: Status | null
  newStatus: Status | null
  rejectionReason: string | null
  createdAt: string
  createdBy: string
}

type AuditLog = {
  id: string
  action: string
  target: string
  createdAt: string
  createdBy: string
}

const workflow: Status[] = [
  'درخواست پرونده',
  'پرونده پرسنلی',
  'کارت عادی',
  'سه‌برگی عادی',
  'تکمیل اطلاعات',
  'پرونده فعال',
  'ارسال به مرکز',
  'بررسی مرکز',
  'تأیید شده',
  'رد شده',
  'ارسال به شرکت',
  'پایان کار',
]

const nextStatuses: Partial<Record<Status, Status[]>> = {
  'درخواست پرونده': ['پرونده پرسنلی'],
  'پرونده پرسنلی': ['کارت عادی'],
  'کارت عادی': ['سه‌برگی عادی'],
  'سه‌برگی عادی': ['تکمیل اطلاعات'],
  'تکمیل اطلاعات': ['پرونده فعال'],
  'پرونده فعال': ['ارسال به مرکز'],
  'ارسال به مرکز': ['بررسی مرکز'],
  'بررسی مرکز': ['تأیید شده', 'رد شده'],
  'تأیید شده': ['ارسال به شرکت'],
  'رد شده': ['تکمیل اطلاعات'],
  'ارسال به شرکت': ['پایان کار'],
}

type Permission = 'view_persons' | 'create_person' | 'change_status' | 'view_activities' | 'manage_users' | 'view_reports'
const rolePermissions: Record<string, Permission[]> = {
  admin: ['view_persons', 'create_person', 'change_status', 'view_activities', 'manage_users', 'view_reports'],
  assistant: ['view_persons', 'create_person'],
  reviewer: ['view_persons', 'change_status', 'view_activities'],
}

const statusTone: Record<Status, string> = {
  'درخواست پرونده': 'blue',
  'پرونده پرسنلی': 'indigo',
  'کارت عادی': 'purple',
  'سه‌برگی عادی': 'purple',
  'تکمیل اطلاعات': 'amber',
  'پرونده فعال': 'green',
  'ارسال به مرکز': 'cyan',
  'بررسی مرکز': 'orange',
  'تأیید شده': 'green',
  'رد شده': 'red',
  'ارسال به شرکت': 'pink',
  'پایان کار': 'slate',
}

const personNames = [
  ['علی', 'رضایی', 'محمد'],
  ['سارا', 'احمدی', 'حسن'],
  ['محمد', 'کریمی', 'علی'],
  ['نگار', 'موسوی', 'رضا'],
  ['امیر', 'حسینی', 'کاظم'],
  ['مریم', 'اکبری', 'جواد'],
  ['رضا', 'مرادی', 'احمد'],
  ['نیلوفر', 'قاسمی', 'حسین'],
  ['مهدی', 'صادقی', 'علی'],
  ['پریسا', 'یوسفی', 'محمود'],
  ['حامد', 'نوری', 'حسن'],
  ['الهام', 'شریفی', 'رضا'],
  ['سینا', 'طاهری', 'کریم'],
  ['فاطمه', 'نعمتی', 'محمد'],
  ['یاسر', 'رستمی', 'اکبر'],
  ['مهسا', 'کاظمی', 'حسین'],
  ['آرمان', 'مهدوی', 'رضا'],
  ['سمیه', 'رحیمی', 'علی'],
  ['نوید', 'حیدری', 'مسعود'],
  ['آتنا', 'جعفری', 'حسن'],
] as const

const initialPeople: Person[] = personNames.map(([firstName, lastName, fatherName], index) => ({
  id: `P-${14001 + index}`,
  firstName,
  lastName,
  fatherName,
  nationalId: `0012345${String(index).padStart(3, '0')}`,
  birthDate: `۱۳۷${index % 10}/${String((index % 12) + 1).padStart(2, '0')}/${String((index % 27) + 1).padStart(2, '0')}`,
  status: workflow[index % workflow.length],
  updatedAt: `${index + 1} شهریور ۱۴۰۵`,
  updatedBy: index % 2 === 0 ? 'احمد محمدی' : 'مریم رضایی',
}))

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87',
    workflow: 'M4 4h6v6H4zM14 14h6v6h-6zM10 7h4a2 2 0 0 1 2 2v5',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 15l2 2-2 2-2-2',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9',
    plus: 'M12 5v14M5 12h14',
    close: 'M6 6l12 12M18 6 6 18',
    check: 'm5 12 4 4L19 6',
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name] ?? paths.grid} /></svg>
}

function Avatar({ text, tone = 'blue' }: { text: string; tone?: string }) {
  return <span className={`avatar ${tone}`}>{text}</span>
}

function Badge({ status }: { status: Status }) {
  return <span className={`badge ${statusTone[status]}`}><i />{status}</span>
}

function Heading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="heading"><div><small>سامانه ناب</small><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [role, setRole] = useState('admin')
  const [page, setPage] = useState<Page>('dashboard')
  const [people, setPeople] = useState(initialPeople)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('همه وضعیت‌ها')
  const [selected, setSelected] = useState<Person | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [activities, setActivities] = useState<ActivityLog[]>(
    initialPeople.map((person, index) => ({
      id: `ACT-${index + 1}`,
      personId: person.id,
      personName: `${person.firstName} ${person.lastName}`,
      action: index % 2 ? 'ایجاد پرونده جدید' : 'تغییر وضعیت پرونده',
      previousStatus: null,
      newStatus: person.status,
      rejectionReason: person.status === 'رد شده' ? 'نقص اطلاعات' : null,
      createdAt: `${person.updatedAt} · ۱۴:۳۲`,
      createdBy: person.updatedBy,
    })),
  )
  const [audit, setAudit] = useState<AuditLog[]>([
    { id: 'AUD-01', action: 'ورود به سامانه', target: 'admin', createdAt: 'امروز · ۰۸:۴۵', createdBy: 'احمد محمدی' },
    { id: 'AUD-02', action: 'ایجاد فرد', target: 'علی رضایی', createdAt: 'امروز · ۰۹:۱۲', createdBy: 'احمد محمدی' },
  ])

  const can = (permission: Permission) => rolePermissions[role].includes(permission)
  const filteredPeople = useMemo(() => people.filter((person) => {
    const text = `${person.firstName} ${person.lastName} ${person.nationalId}`
    return (!query || text.includes(query)) && (filter === 'همه وضعیت‌ها' || person.status === filter)
  }), [filter, people, query])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const updatePerson = (person: Person, nextStatus: Status, rejectionReason: string | null) => {
    const date = 'امروز · ۱۴:۳۲'
    setPeople((current) => current.map((item) => item.id === person.id ? { ...item, status: nextStatus, updatedAt: date, updatedBy: 'احمد محمدی' } : item))
    setActivities((current) => [{
      id: `ACT-${Date.now()}`,
      personId: person.id,
      personName: `${person.firstName} ${person.lastName}`,
      action: nextStatus === 'رد شده' ? 'رد پرونده' : 'تغییر وضعیت پرونده',
      previousStatus: person.status,
      newStatus: nextStatus,
      rejectionReason,
      createdAt: date,
      createdBy: 'احمد محمدی',
    }, ...current])
    setAudit((current) => [{ id: `AUD-${Date.now()}`, action: nextStatus === 'رد شده' ? 'رد پرونده' : 'تغییر وضعیت پرونده', target: `${person.firstName} ${person.lastName}`, createdAt: date, createdBy: 'احمد محمدی' }, ...current])
    setSelected(null)
    notify('وضعیت پرونده و تاریخچه فعالیت ثبت شد')
  }

  if (!authenticated) return <Login onLogin={(nextRole) => { setRole(nextRole); setAuthenticated(true) }} />

  const navigation: [Page, string, string][] = [
    ['dashboard', 'داشبورد', 'grid'],
    ['persons', 'مدیریت افراد', 'users'],
    ['workflow', 'گردش‌کار پرونده', 'workflow'],
    ['activities', 'گزارش فعالیت‌ها', 'activity'],
    ['users', 'کاربران و دسترسی‌ها', 'shield'],
    ['reports', 'گزارش‌ها و Audit Log', 'activity'],
    ['settings', 'تنظیمات', 'settings'],
  ]

  return <div className="app" dir="rtl">
    <aside className="sidebar">
      <div className="brand"><b>ن</b><span><strong>ناب</strong><small>سامانه مدیریت پرونده</small></span></div>
      <small className="menu-title">منوی اصلی</small>
      {navigation.filter(([id]) => id === 'dashboard' || id === 'persons' || (id === 'workflow' && can('change_status')) || (id === 'activities' && can('view_activities')) || (id === 'users' && can('manage_users')) || (id === 'reports' && can('view_reports')) || id === 'settings').map(([id, label, icon]) => <button className={`nav ${page === id ? 'active' : ''}`} key={id} onClick={() => setPage(id)}><Icon name={icon} /><span>{label}</span>{id === 'activities' && <em>۳</em>}</button>)}
      <div className="side-bottom"><div className="help">؟<span>نیاز به راهنمایی دارید؟<small>راهنمای سامانه را ببینید</small></span></div><button className="profile" onClick={() => setAuthenticated(false)}><Avatar text="ا" tone="green" /><span><b>احمد محمدی</b><small>مدیر سیستم · خروج</small></span></button></div>
    </aside>
    <main>
      <header><span>خانه / <b>{navigation.find((item) => item[0] === page)?.[1]}</b></span><div className="head-user"><button><Icon name="bell" /></button><Avatar text="ا" tone="green" /><span><b>احمد محمدی</b><small>مدیر سیستم</small></span></div></header>
      <div className="content">
        {page === 'dashboard' && <Dashboard people={people} onPersons={() => setPage('persons')} onSelect={setSelected} />}
        {page === 'persons' && <Persons canCreate={can('create_person')} people={filteredPeople} filter={filter} query={query} setFilter={setFilter} setQuery={setQuery} onCreate={() => setCreateOpen(true)} onSelect={setSelected} />}
        {page === 'workflow' && <WorkflowBoard people={people} onSelect={setSelected} canChange={can('change_status')} />}
        {page === 'activities' && <Activities activities={activities} />}
        {page === 'users' && <Users />}
        {page === 'reports' && <Reports activities={activities} audit={audit} />}
        {page === 'settings' && <Settings />}
      </div>
    </main>
    {selected && <PersonModal person={selected} onClose={() => setSelected(null)} onUpdate={updatePerson} />}
    {createOpen && <CreateModal existing={people} onClose={() => setCreateOpen(false)} onCreate={(person) => {
      setPeople((current) => [person, ...current])
      setActivities((current) => [{ id: `ACT-${Date.now()}`, personId: person.id, personName: `${person.firstName} ${person.lastName}`, action: 'ایجاد پرونده جدید', previousStatus: null, newStatus: person.status, rejectionReason: null, createdAt: 'همین الان', createdBy: 'احمد محمدی' }, ...current])
      setAudit((current) => [{ id: `AUD-${Date.now()}`, action: 'ایجاد فرد', target: `${person.firstName} ${person.lastName}`, createdAt: 'همین الان', createdBy: 'احمد محمدی' }, ...current])
      setCreateOpen(false)
      notify('فرد جدید با موفقیت ثبت شد')
    }} />}
    {toast && <div className="toast">✓ {toast}</div>}
  </div>
}

function Login({ onLogin }: { onLogin: (role: string) => void }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!username || !password) { setError('نام کاربری و رمز عبور الزامی است.'); return }
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      if (username === 'admin' && password === 'admin') onLogin()
      else setError('نام کاربری یا رمز عبور نادرست است.')
    }, 500)
  }
  return <div className="login" dir="rtl">
    <section><div className="login-brand">ن</div><h1>مدیریت هوشمند<br /><i>پرونده‌های سازمانی</i></h1><p>همه‌چیز برای مدیریت دقیق، امن و شفاف در یک سامانه.</p><span>✓ دسترسی امن و سطح‌بندی شده</span><span>✓ گزارش‌گیری لحظه‌ای</span></section>
    <form onSubmit={submit}><div className="form-brand">ن <b>خوش آمدید</b><small>برای ورود به سامانه وارد شوید</small></div><label>نام کاربری<input value={username} onChange={(event) => { setUsername(event.target.value); setError('') }} /></label><label>رمز عبور<input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} /></label>{error && <div className="error">{error}</div>}<div className="login-row"><span>□ مرا به خاطر بسپار</span><a>رمز عبور را فراموش کرده‌اید؟</a></div><button className="primary" disabled={loading}>{loading ? 'در حال بررسی...' : 'ورود به سامانه ←'}</button><small className="demo">ورود آزمایشی: admin / admin</small></form>
  </div>
}

function Dashboard({ people, onPersons, onSelect }: { people: Person[]; onPersons: () => void; onSelect: (person: Person) => void }) {
  const count = (status: Status) => people.filter((person) => person.status === status).length
  const cards: [string, number, string][] = [['کل افراد', people.length, 'blue'], ['درخواست‌های جدید', count('درخواست پرونده'), 'amber'], ['پرونده‌های فعال', count('پرونده فعال'), 'green'], ['در انتظار بررسی', count('بررسی مرکز'), 'purple']]
  return <><Heading title="صبح بخیر، احمد 👋" subtitle="در یک نگاه وضعیت پرونده‌ها و فعالیت‌های سامانه را بررسی کنید." action={<button className="primary" onClick={onPersons}><Icon name="plus" /> ثبت فرد جدید</button>} /><div className="stats">{cards.map(([label, value, color]) => <div className="stat" key={label}><div className={`stat-icon ${color}`}><Icon name="users" /></div><span>{label}<b>{value.toLocaleString('fa-IR')}</b><small>در سامانه ثبت شده</small></span></div>)}</div><div className="grid2"><section className="panel"><h2>روند پرونده‌ها <small>تعداد پرونده‌های ثبت‌شده در ۶ ماه گذشته</small></h2><div className="chart"><svg viewBox="0 0 600 180" preserveAspectRatio="none"><path d="M0 140 C60 140 80 100 140 125 S210 130 260 90 S330 110 380 80 S440 60 490 72 S540 50 600 18 V180H0Z" fill="#e8ecff" /><path d="M0 140 C60 140 80 100 140 125 S210 130 260 90 S330 110 380 80 S440 60 490 72 S540 50 600 18" fill="none" stroke="#5267f5" strokeWidth="3" /></svg><div>فروردین - اردیبهشت - خرداد - تیر - مرداد - شهریور</div></div></section><section className="panel"><h2>وضعیت پرونده‌ها <small>بر اساس مرحله‌ی گردش‌کار</small></h2><div className="donut"><div><b>{people.length}</b><small>کل پرونده</small></div></div><div className="legend">● فعال {count('پرونده فعال')}<br />● در انتظار بررسی {count('بررسی مرکز')}<br />● رد شده {count('رد شده')}<br />● پایان یافته {count('پایان کار')}</div></section></div><div className="grid2"><section className="panel"><div className="panel-title"><h2>آخرین افراد ثبت‌شده</h2><button onClick={onPersons}>مشاهده همه ←</button></div>{people.slice(0, 6).map((person) => <div className="mini-row" key={person.id} onClick={() => onSelect(person)}><span><Avatar text={person.firstName[0]} /><b>{person.firstName} {person.lastName}<small>{person.id}</small></b></span><Badge status={person.status} /><small>{person.updatedAt}</small></div>)}</section><section className="panel"><div className="panel-title"><h2>فعالیت‌های اخیر</h2></div>{people.slice(0, 5).map((person, index) => <div className="activity" key={person.id}><i className={`dot d${index}`} /><span><b>{index % 2 ? 'ایجاد پرونده جدید' : 'تغییر وضعیت پرونده'}</b><small>{person.firstName} {person.lastName} · {person.status}</small></span><time>امروز، ۱۴:۳۲</time></div>)}</section></div></>
}

function Persons({ people, query, filter, setQuery, setFilter, onCreate, onSelect }: { people: Person[]; query: string; filter: string; setQuery: (value: string) => void; setFilter: (value: string) => void; onCreate: () => void; onSelect: (person: Person) => void }) {
  return <><Heading title="افراد" subtitle="اطلاعات افراد و وضعیت پرونده‌های آن‌ها را مدیریت کنید." action={<button className="primary" onClick={onCreate}><Icon name="plus" /> افزودن فرد</button>} /><section className="panel people"><div className="toolbar"><div className="search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجو بر اساس نام، نام خانوادگی یا کد ملی..." /></div><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>همه وضعیت‌ها</option>{workflow.map((status) => <option key={status}>{status}</option>)}</select></div><div className="people-head">فرد | کد ملی | تاریخ تولد | وضعیت پرونده | آخرین فعالیت | ثبت‌کننده</div>{people.map((person) => <div className="person-row" key={person.id} onClick={() => onSelect(person)}><span><Avatar text={person.firstName[0]} /><b>{person.firstName} {person.lastName}<small>{person.id}</small></b></span><span>{person.nationalId}</span><span>{person.birthDate}</span><Badge status={person.status} /><span>{person.updatedAt}</span><span>{person.updatedBy}</span></div>)}{people.length === 0 && <div className="empty">نتیجه‌ای پیدا نشد</div>}</section></>
}

function WorkflowBoard({ people, onSelect }: { people: Person[]; onSelect: (person: Person) => void }) {
  return <><Heading title="گردش‌کار پرونده" subtitle="پرونده‌ها را در مسیر مرحله‌ای ثبت تا پایان کار دنبال کنید." /><div className="workflow">{workflow.slice(0, 9).map((status, index) => <section key={status}><h3><b>{index + 1}</b>{status}<small>{people.filter((person) => person.status === status).length} پرونده</small></h3>{people.filter((person) => person.status === status).map((person) => <button key={person.id} onClick={() => onSelect(person)}><Avatar text={person.firstName[0]} /><span><b>{person.firstName} {person.lastName}</b><small>{person.id}</small></span></button>)}</section>)}</div></>
}

function Activities({ activities }: { activities: ActivityLog[] }) {
  return <><Heading title="گزارش فعالیت‌ها" subtitle="Activity Log تاریخچه‌ی دائمی تغییرات پرونده‌هاست و قابل حذف نیست." action={<button className="outline">خروجی اکسل ←</button>} /><section className="panel activity-table">{activities.map((activity) => <div className="activity-row" key={activity.id}><i className="dot d1" /><span><b>{activity.action}</b><small>{activity.personName}{activity.rejectionReason ? ` · علت رد: ${activity.rejectionReason}` : ''}</small></span>{activity.newStatus && <Badge status={activity.newStatus} />}<time>{activity.createdAt}</time><em>{activity.createdBy}</em></div>)}</section></>
}

function Users() {
  const users = [['احمد محمدی', 'مدیر سیستم', 'دسترسی کامل', 'green'], ['مریم رضایی', 'کارشناس پرونده', 'مدیریت افراد', 'blue'], ['محمد رضایی', 'کارشناس مرکز', 'بررسی پرونده', 'purple'], ['سارا کریمی', 'اپراتور', 'مشاهده گزارش‌ها', 'orange']]
  return <><Heading title="کاربران و دسترسی‌ها" subtitle="کاربران سامانه و مجوزهای Permission-Based آن‌ها را مدیریت کنید." action={<button className="primary"><Icon name="plus" /> کاربر جدید</button>} /><section className="panel users">{users.map(([name, role, access, avatarTone]) => <div className="user" key={name}><Avatar text={name[0]} tone={avatarTone} /><span><b>{name}</b><small>{role}</small><em>● {access}</em></span><button>•••</button></div>)}</section><section className="panel permission-panel"><h2>مجوزهای نمونه دستیار</h2><p>دستیار فقط به عملیات مجاز پرونده دسترسی دارد.</p><div className="permission-list"><span>✓ مشاهده افراد</span><span>✓ ایجاد فرد</span><span>✓ تغییر وضعیت پرونده</span><span>✓ مشاهده پرونده</span><span className="disabled">× حذف فرد</span><span className="disabled">× تغییر Permission</span></div></section></>
}

function Reports({ activities, audit }: { activities: ActivityLog[]; audit: AuditLog[] }) {
  return <><Heading title="گزارش‌ها و Audit Log" subtitle="گزارش‌های مدیریتی و عملیات حساس ثبت‌شده در سامانه." action={<button className="outline">خروجی گزارش ←</button>} /><div className="stats report-stats"><div className="stat"><span>کل Activityها<b>{activities.length.toLocaleString('fa-IR')}</b><small>رویداد پرونده</small></span></div><div className="stat"><span>Audit Log<b>{audit.length.toLocaleString('fa-IR')}</b><small>عملیات حساس</small></span></div><div className="stat"><span>پرونده‌های رد شده<b>{activities.filter((item) => item.newStatus === 'رد شده').length.toLocaleString('fa-IR')}</b><small>نیازمند اصلاح</small></span></div><div className="stat"><span>ثبت امروز<b>۲۴</b><small>عملیات ثبت‌شده</small></span></div></div><div className="grid2"><section className="panel"><h2>Audit Log <small>رویدادهای حساس و غیرقابل حذف</small></h2>{audit.map((item) => <div className="audit-row" key={item.id}><span><b>{item.action}</b><small>هدف: {item.target}</small></span><time>{item.createdAt}<br />{item.createdBy}</time></div>)}</section><section className="panel"><h2>خلاصه‌ی وضعیت‌ها</h2><div className="report-bars">{workflow.slice(0, 8).map((status, index) => <div key={status}><span>{status}<b>{Math.max(1, 18 - index * 2)}</b></span><i><em style={{ width: `${Math.max(18, 100 - index * 9)}%` }} /></i></div>)}</div></section></div></>
}

function Settings() {
  return <><Heading title="تنظیمات" subtitle="تنظیمات عمومی و امنیتی سامانه ناب." /><div className="grid2"><section className="panel settings"><h2>تنظیمات عمومی</h2><p>اطلاعات پایه سامانه</p><label>نام سامانه<input defaultValue="سامانه مدیریت پرونده ناب" /></label><label>منطقه زمانی<select defaultValue="tehran"><option value="tehran">Asia/Tehran (UTC+۳:۳۰)</option></select></label><button className="primary">ذخیره تغییرات</button></section><section className="panel settings"><h2>امنیت و نشست</h2><p>کنترل دسترسی و ورود کاربران</p>{['تأیید دو مرحله‌ای', 'ثبت رخدادهای امنیتی', 'خروج خودکار'].map((item, index) => <div className="toggle-row" key={item}><span><b>{item}</b><small>{index === 0 ? 'برای مدیران الزامی باشد' : index === 1 ? 'ذخیره تغییرات حساس در Audit Log' : 'پس از ۳۰ دقیقه عدم فعالیت'}</small></span><i className={index < 2 ? 'on' : ''} /></div>)}</section></div></>
}

function PersonModal({ person, onClose, onUpdate }: { person: Person; onClose: () => void; onUpdate: (person: Person, nextStatus: Status, rejectionReason: string | null) => void }) {
  const [nextStatus, setNextStatus] = useState<Status>(person.status)
  const [reason, setReason] = useState('')
  const currentIndex = workflow.indexOf(person.status)
  const nextOptions: Status[] = person.status === 'بررسی مرکز' ? ['تأیید شده', 'رد شده'] : workflow[currentIndex + 1] ? [workflow[currentIndex + 1]] : []
  return <div className="backdrop"><div className="modal"><button className="x" onClick={onClose}><Icon name="close" /></button><small>جزئیات فرد · {person.id}</small><h2>{person.firstName} {person.lastName}</h2><div className="summary"><Avatar text={person.firstName[0]} /><span><b>{person.firstName} {person.lastName}</b><small>آخرین ثبت: {person.updatedAt} · {person.updatedBy}</small></span><Badge status={person.status} /></div><div className="details"><span>کد ملی<b>{person.nationalId}</b></span><span>تاریخ تولد<b>{person.birthDate}</b></span><span>نام پدر<b>{person.fatherName}</b></span><span>ثبت‌کننده<b>{person.updatedBy}</b></span></div><div className="stepper">{workflow.slice(0, 9).map((status, index) => <span className={index <= currentIndex ? 'done' : ''} key={status}>{index + 1}</span>)}</div>{nextOptions.length > 0 ? <label>تغییر وضعیت پرونده<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as Status)}><option value={person.status}>{person.status} (فعلی)</option>{nextOptions.map((status) => <option key={status}>{status}</option>)}</select></label> : <div className="modal-note">این پرونده در وضعیت نهایی قرار دارد.</div>}{nextStatus === 'رد شده' && <label>علت رد اجباری<textarea required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="علت رد پرونده را وارد کنید..." /></label>}<div className="modal-actions"><button className="outline" onClick={onClose}>انصراف</button><button className="primary" disabled={nextStatus === person.status || (nextStatus === 'رد شده' && !reason.trim())} onClick={() => onUpdate(person, nextStatus, nextStatus === 'رد شده' ? reason : null)}><Icon name="check" /> ذخیره تغییرات</button></div></div></div>
}

function CreateModal({ existing, onClose, onCreate }: { existing: Person[]; onClose: () => void; onCreate: (person: Person) => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (existing.some((person) => person.nationalId === nationalId)) { setError('این کد ملی قبلاً ثبت شده است.'); return }
    onCreate({ id: `P-${Date.now().toString().slice(-5)}`, firstName, lastName, nationalId, birthDate: birthDate || '—', fatherName: fatherName || '—', status: 'درخواست پرونده', updatedAt: 'همین الان', updatedBy: 'احمد محمدی' })
  }
  return <div className="backdrop"><form className="modal" onSubmit={submit}><button type="button" className="x" onClick={onClose}><Icon name="close" /></button><small>ثبت اطلاعات پایه</small><h2>افزودن فرد جدید</h2><p>فقط اطلاعات متنی هویتی ثبت می‌شود؛ هیچ فایل یا مدرکی در سامانه بارگذاری نمی‌شود.</p><div className="form-grid"><label>نام *<input required value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label>نام خانوادگی *<input required value={lastName} onChange={(event) => setLastName(event.target.value)} /></label><label>کد ملی *<input required pattern="[0-9۰-۹]{10}" value={nationalId} onChange={(event) => { setNationalId(event.target.value); setError('') }} /></label><label>تاریخ تولد<input value={birthDate} onChange={(event) => setBirthDate(event.target.value)} placeholder="۱۳۷۸/۰۲/۱۲" /></label><label>نام پدر<input value={fatherName} onChange={(event) => setFatherName(event.target.value)} /></label></div>{error && <div className="error">{error}</div>}<div className="modal-actions"><button type="button" className="outline" onClick={onClose}>انصراف</button><button className="primary"><Icon name="plus" /> ثبت فرد</button></div></form></div>
}
