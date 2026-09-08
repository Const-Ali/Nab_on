/** رشته‌های یوتیلیتی مشترک (اتم‌های سیستم طراحی) — همه literal تا JIT آن‌ها را تولید کند */

// ─── دکمه‌ها ───
export const btnPrimary = 'inline-flex items-center justify-center rounded-[8px] border border-pri bg-pri px-[15px] py-[10px] text-[11px] font-semibold text-white shadow-[0_7px_16px_rgba(82,103,245,.18)] disabled:cursor-not-allowed disabled:opacity-[.55] disabled:shadow-none'
export const btnOutline = 'inline-flex items-center justify-center rounded-[8px] border border-[#dfe4ee] bg-white px-[15px] py-[10px] text-[11px] font-semibold text-[#69758b] dark:border-dkline2 dark:bg-dksurf dark:text-[#c6cede]'
export const btnDanger = 'inline-flex items-center justify-center rounded-[8px] border border-[#f0c5c8] bg-white px-[15px] py-[10px] text-[11px] font-semibold text-[#c45158] hover:bg-[#fff5f6] dark:border-[#5a2a30] dark:bg-transparent'
export const btnMini = 'inline-flex items-center gap-[5px] rounded-[8px] border border-[#dfe4ee] bg-[#fbfcfe] px-[10px] py-[7px] text-[9.5px] font-semibold text-[#667288] hover:border-[#c3cdf7] hover:text-pri dark:border-dkline2 dark:bg-dksurf dark:text-[#c6cede]'
export const btnMiniOn = 'border-pri bg-pri text-white hover:border-pri hover:text-white dark:border-pri dark:bg-pri dark:text-white'
export const dangerLiteTxt = '!text-[#c45158] !border-[#f0c5c8]'

// ─── پنل و کارت ───
export const panelBox = 'rounded-card border border-line bg-white shadow-card dark:border-dkline dark:bg-dksurf dark:shadow-[0_12px_34px_rgba(0,0,0,.28)]'
export const panelPad = 'p-[21px]'
export const panelH2 = 'm-0 mb-[18px] text-[14px] font-bold text-[#29354d] dark:text-[#e3e8f5]'
export const panelH2Small = 'mt-[4px] block text-[9px] font-normal text-[#a1aaba]'

// ─── مودال ───
export const backdropCls = 'fixed inset-0 z-[5] grid place-items-center bg-[rgba(18,27,49,.45)] p-[18px]'
export const modalBox = 'relative w-[min(540px,100%)] rounded-[15px] bg-white p-[24px] dark:border dark:border-[#232c45] dark:bg-[#151d30]'
export const modalX = 'absolute left-[17px] top-[15px] border-0 bg-none text-[23px] leading-none text-[#8b96a7]'
export const modalSmall = 'block text-[9px] text-[#9ba5b5] dark:text-[#8d97b0]'
export const modalH2 = 'm-[7px_0_18px] text-[20px] text-[#26324a] dark:text-[#eef2fb]'
export const modalP = 'mb-[18px] text-[10px] text-[#8f9aaa] dark:text-[#8d97b0]'
export const modalH = 'm-[18px_0_9px] text-[11px] font-bold text-[#33405a] dark:text-[#dbe2f2]'
export const modalHSmall = 'font-normal text-faint'
export const modalActions = 'mt-[20px] flex gap-[8px]'
export const modalNote = 'rounded-[8px] bg-[#f6f8fb] p-[10px] text-[10px] text-[#8e9aaa] dark:bg-dksurf dark:text-[#9aa5bc]'

// ─── فرم ───
export const labelCls = 'block text-[10px] text-[#68758a] dark:text-[#9aa5bc]'
export const inputCls = 'mt-[6px] block w-full rounded-[8px] border border-line2 bg-white p-[9px] text-[10px] text-soft outline-0 dark:border-dkline2 dark:bg-dksurf dark:text-[#dfe5f2]'
export const textareaCls = `${inputCls} min-h-[72px] resize-y`
export const selectCls = inputCls
export const formGrid = 'grid grid-cols-2 gap-[12px] max-[700px]:grid-cols-1'
export const errorBox = 'm-[10px_0] rounded-[7px] border border-[#ffd9dc] bg-[#fff0f1] p-[8px_10px] text-[9px] text-[#c45158] dark:border-[#5a2a30] dark:bg-[#311a1e] dark:text-[#f0a8ac]'
export const emptyBox = 'p-[34px] text-center text-[11px] text-faint'
export const rowCheck = 'h-[15px] w-[15px] rounded accent-pri'
export const permGrid = 'mb-[4px] grid grid-cols-2 gap-[7px]'

// ─── جستجو ───
export const searchBox = 'flex flex-1 items-center gap-[7px] rounded-[8px] border border-[#e3e8f0] px-[10px] dark:border-dkline2 dark:bg-dksurf'
export const searchInput = 'w-full border-0 bg-transparent p-[9px] text-[10px] text-ink outline-0 dark:text-[#dfe5f2]'
export const searchIcon = 'h-[17px] w-[17px] text-[#9ca6b5]'

// ─── چیپ‌ها ───
export const chipBase = 'inline-flex items-center gap-[3px] whitespace-nowrap rounded-[6px] px-[8px] py-[2.5px] text-[8px] font-bold not-italic'
export const chipCat = 'bg-[#f0effc] text-[#6d5fc9] dark:bg-[#2a2450] dark:text-[#b3a8f5]'
export const chipTag = 'bg-[#f2f4f9] text-[#8d97a9] dark:bg-[#20294a] dark:text-[#7f8aa3]'
export const dlChipBase = 'mt-[4px] inline-block self-start whitespace-nowrap rounded-[6px] px-[7px] py-[2px] text-[7.5px] font-bold not-italic'
export const staleChip = 'inline-block whitespace-nowrap rounded-[5px] bg-[#ffebed] px-[6px] py-[2px] text-[8px] not-italic text-[#b15b60]'
export const offChip = 'mr-[6px] inline-block rounded-[5px] bg-[#ffebed] px-[5px] py-[1px] text-[7px] not-italic text-[#b15b60]'
export const roleChip = 'inline-block rounded-[5px] bg-[#e7f8ef] px-[5px] py-[1px] text-[7px] font-bold not-italic text-[#1f8f5f]'
export const mentionTxt = 'rounded-[5px] bg-[#dfe6ff] px-[4px] font-bold text-[#4253c9] dark:bg-[#37448c] dark:text-[#cdd6ff]'
export const mentionTag = 'mr-[6px] inline-block rounded-[5px] bg-[#dfe6ff] px-[5px] py-[1px] text-[7px] font-bold not-italic text-[#4253c9] dark:bg-[#37448c] dark:text-[#cdd6ff]'
export const kbdCls = 'rounded-[5px] bg-[#f0f2f7] px-[6px] py-[2px] text-[9px] text-mut dark:bg-[#20294a] dark:text-[#7f8aa3]'

// ─── آواتار ───
export const avatarBase = 'grid h-[34px] w-[34px] flex-[0_0_34px] place-items-center rounded-[10px] text-[13px] font-bold'
export const avatarTones: Record<string, string> = {
  green: 'bg-[#d9f5e8] text-[#137852]',
  blue: 'bg-[#e0e7ff] text-[#4260cf]',
  purple: 'bg-[#efe4ff] text-[#8353c7]',
  orange: 'bg-[#fff0d7] text-[#ba7729]',
  slate: 'bg-[#eef1f5] text-[#778397]',
}

// ─── بج وضعیت ───
export const badgeBase = 'inline-flex items-center gap-[4px] whitespace-nowrap rounded-[5px] px-[7px] py-[4px] text-[8px]'
export const badgeDot = 'h-[5px] w-[5px] rounded-full bg-current'
export const badgeTones: Record<string, string> = {
  blue: 'bg-[#edf1ff] text-[#5072d7]',
  indigo: 'bg-[#eceeff] text-[#5a63bd]',
  purple: 'bg-[#f1eaff] text-[#8759ca]',
  amber: 'bg-[#fff2dc] text-[#c78529]',
  orange: 'bg-[#fff2dc] text-[#c78529]',
  green: 'bg-[#e5f7ee] text-[#239b69]',
  cyan: 'bg-[#e2f7f7] text-[#2999aa]',
  red: 'bg-[#ffebed] text-[#d26166]',
  pink: 'bg-[#ffeaf2] text-[#c65f8d]',
  slate: 'bg-[#eef1f5] text-[#778397]',
}

// ─── اسکلتون ───
export const shimmerBox = 'rounded-[13px] bg-[linear-gradient(100deg,#edf0f6_40%,#f7f9fd_50%,#edf0f6_60%)] bg-[length:200%_100%] animate-shimmer dark:bg-[linear-gradient(100deg,#182036_40%,#1f2945_50%,#182036_60%)]'
