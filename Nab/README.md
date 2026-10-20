# سامانه ناب | مدیریت پرونده‌های سازمانی

اپلیکیشن وب تک‌صفحه‌ای (SPA) فارسی و راست‌چین برای مدیریت پرونده‌ها، گردش‌کار (Workflow)، کاربران و دسترسی‌ها، گزارش‌گیری و مدیریت کارهای شخصی.

## تکنولوژی‌ها

- **React 19 + TypeScript 6 + Vite 8**
- **Tailwind CSS 3.4** (دارک‌مود با `[data-theme='dark']`)
- بدون وابستگی ران‌تایم خارجی — فونت‌های ایرانی به‌صورت خودمیزبان در `public/fonts/`
- ذخیره‌سازی سمت مرورگر با `localStorage` (بدون بک‌اند)

## شروع سریع

```bash
npm install      # نصب وابستگی‌ها
npm run dev      # سرور توسعه روی http://localhost:5173
npm run build    # بیلد production در dist/
npm run preview  # پیش‌نمایش بیلد
npm run lint     # بررسی ESLint
```

## ورود دمو

| کاربر | نام کاربری | رمز | نقش |
|------|-----------|------|------|
| احمد محمدی | `admin` | `admin` | مدیر سیستم (دسترسی کامل) |
| مریم رضایی | `assistant` | `assistant` | کارشناس پرونده |
| محمد رضایی | `reviewer` | `reviewer` | کارشناس مرکز |
| سارا کریمی | `operator` | `1234` | اپراتور (غیرفعال) |

## ساختار پروژه

```
src/
├── App.tsx                  # شل برنامه: سایدبار، هدر، مسیریابی صفحات، state سراسری
├── types.ts                 # همه‌ی تایپ‌های مشترک (Person, User, Note, ...)
├── app-lib.ts               # داده‌ی اولیه + منطق خالص (workflow, گزارش، فونت‌ها)
├── shared.ts                # توابع کمکی (localStorage, تقویم شمسی, نرمال‌سازی متن)
├── shared-ui.tsx            # Icon, Avatar, Heading, MiniCalendar, BirthDateField
├── index.css                # دستورات Tailwind + ریست‌های پایه
├── components/
│   ├── ui.ts                # اتم‌های طراحی (رشته‌های یوتیلیتی مشترک تیلویند)
│   ├── pages/               # Login, Dashboard, Persons, WorkflowBoard,
│   │                        # Activities, Users, Reports, Settings
│   ├── modals/              # PersonModal, CreateModal, EditModal, RoleModal,
│   │                        # AddUserModal, EditUserModal, ProfileModal, SearchModal
│   └── common/              # Badge, Skeleton, LiveClock, PhotoField, PrintPerson,
│                            # PrintReport
└── tasks/                   # ماژول مدیریت کارهای شخصی (ذخیره‌سازی مجزا به‌ازای هر کاربر)
    ├── WorkManagementPage.tsx
    ├── types.ts / utils.ts
    └── components/          # WorkDashboard, TaskFilters, TaskList, TaskKanban,
                             # TaskCard, TaskDetails, TaskForm
```

## قابلیت‌ها

- ✅ فارسی/راست‌چین کامل با ۵ فونت ایرانی انتخاب‌پذیر (وزیرمتن، استعداد، سمیم، شبنم، لاله‌زار)
- ✅ حالت تاریک (تاگل در هدر)
- ✅ گردش‌کار ۱۲ مرحله‌ای پرونده با کانبان درگ‌اند‌دراپ
- ✅ نقش‌ها و دسترسی‌های دانه‌ای (۸ سطح مجوز)
- ✅ یادداشت‌ها، منشن، تاریخچه‌ی تغییرات و Audit Log
- ✅ تقویم شمسی داخلی (بدون کتابخانه)
- ✅ گزارش‌ها و خروجی CSV / چاپ
- ✅ داشبورد کارهای شخصی مستقل برای هر کاربر
- ✅ PWA (Service Worker + مانیفست)
