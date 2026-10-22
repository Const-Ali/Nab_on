import { Button } from '../common/Button'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../../shared-ui'
import { formatServerTimestamp } from '../../shared'
import { personTags, deadlineLeft, staleDays } from '../../app-lib'
import type { Person, Activity, User, Note } from '../../types'
import type { WorkflowConfig, WorkflowStage } from '../../workflow'
import { checklistMissing, stageById, stageIdForPerson } from '../../workflow'
import { Badge } from '../common/Badge'
import { backdropCls, cn, modalBox, modalFormLayout, personDetailLayout } from '../ui'

export function PersonModal({
  person,
  workflowConfig,
  notes,
  history,
  meUsername,
  usersList,
  canChange,
  canAssign,
  canCompleteChecklist,
  canViewPersonNotes,
  canViewHistory,
  canCreateNote,
  canEditNotes,
  canDeleteNotes,
  canManageAnyNote,
  canPrint,
  canDelete,
  canEdit,
  onClose,
  onUpdate,
  onChecklistToggle,
  onDelete,
  onEdit,
  onAssign,
  onAddNote,
  onEditNote,
  onDeleteNote,
}: {
  person: Person
  workflowConfig: WorkflowConfig
  notes: Note[]
  history: Activity[]
  meUsername: string
  usersList: User[]
  canChange: boolean
  canAssign: boolean
  canCompleteChecklist: boolean
  canViewPersonNotes: boolean
  canViewHistory: boolean
  canCreateNote: boolean
  canEditNotes: boolean
  canDeleteNotes: boolean
  canManageAnyNote: boolean
  canPrint: boolean
  canDelete: boolean
  canEdit: boolean
  onClose: () => void
  onUpdate: (p: Person, targetStageId: string, r: string | null) => void
  onChecklistToggle: (p: Person, stageId: string, itemId: string, done: boolean) => void
  onDelete: (p: Person) => void
  onEdit: (p: Person) => void
  onAssign: (p: Person, username: string) => void
  onAddNote: (personId: string, text: string, replyTo?: { author: string; text: string }) => void
  onEditNote: (noteId: string, text: string) => void
  onDeleteNote: (noteId: string) => void
}) {
  const currentStageId = stageIdForPerson(person, workflowConfig)
  const currentStage = stageById(workflowConfig, currentStageId)
  const [targetStageId, setTargetStageId] = useState(currentStageId)
  const [reason, setReason] = useState('')
  const options = (currentStage?.nextStageIds ?? []).map(id => stageById(workflowConfig, id)).filter((stage): stage is WorkflowStage => Boolean(stage && !stage.archived))
  const targetStage = stageById(workflowConfig, targetStageId)
  const needsReason = targetStageId === 'rejected'
  const missingChecklist = currentStage ? checklistMissing(currentStage, person) : []
  const checklistMarks = person.stageChecklist?.[currentStageId] ?? {}
  const stages = workflowConfig.stages
  const currentStatus = currentStage?.label ?? person.status
  const [noteText, setNoteText] = useState('')
  const [tab, setTab] = useState<'chat' | 'history'>(canViewPersonNotes ? 'chat' : 'history')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState<Note | null>(null)

  const saveNoteEdit = () => {
    if (editingNote && editText.trim()) {
      onEditNote(editingNote, editText.trim())
      setEditingNote(null)
    }
  }

  const mentionMatch = noteText.match(/@([^\s@]*)$/)
  const suggestions = mentionMatch
    ? usersList.filter(u => u.active && u.name.toLowerCase().includes(mentionMatch[1].toLowerCase())).slice(0, 4)
    : []

  const insertMention = (name: string) => setNoteText(cur => cur.replace(/@[^\s@]*$/, `@${name} `))
  const renderText = (text: string) =>
    text.split(/(\s+)/).map((w, i) => (w.startsWith('@') && w.length > 1 ? <span key={i} className="mention">{w}</span> : w))

  const dLeft = deadlineLeft(person, workflowConfig)
  const daysInStage = staleDays(person, workflowConfig)
  const hasStalledAlert = Boolean(currentStage?.stalledAfterDays && !currentStage.archived && !currentStage.isFinal && daysInStage >= currentStage.stalledAfterDays)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [notes.length])

  const activeTab = canViewPersonNotes ? (canViewHistory ? tab : 'chat') : 'history'

  const currentIndex = stages.findIndex(stage => stage.id === currentStageId)
  const ownsNote = (note: Note) => note.authorUsername === meUsername

  const submitNote = () => {
    const text = noteText.trim()
    if (!text) return
    onAddNote(person.id, text, replyTo ? { author: replyTo.author, text: replyTo.text } : undefined)
    setNoteText('')
    setReplyTo(null)
  }

  const assignedUser = usersList.find(u => u.username === person.assignee)

  return (
    <div className={backdropCls} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={cn(modalBox, modalFormLayout, personDetailLayout, 'person-modal max-h-[calc(100dvh-1rem-env(safe-area-inset-bottom))] max-w-5xl overflow-y-auto sm:max-h-[calc(100vh-2rem)]')} onClick={e => e.stopPropagation()}>
        <Button type="button" variant="ghost" size="xs" className="x" onClick={onClose} title="بستن" aria-label="بستن">بستن</Button>
        <small>جزئیات فرد · {person.id}</small>
        <h2>{person.firstName} {person.lastName}</h2>
        <div className="summary">
          <Avatar text={person.firstName[0]} src={person.photo} size={44} />
          <span>
            <b>{person.firstName} {person.lastName}</b>
            <small>آخرین ثبت: {formatServerTimestamp(person.updatedAt, person.ts)} · {person.updatedBy}</small>
          </span>
          <span className="sum-side">
            <Badge status={currentStatus} tone={currentStage?.tone} />
            {(person.tags ?? []).map(t => <span className={`tag-chip sm ${personTags[t]}`} key={t}>{t}</span>)}
          </span>
        </div>
        {hasStalledAlert && (
          <div className="modal-note stale-note" role="status">
            ⏰ این پرونده {daysInStage.toLocaleString('fa-IR')} روز است که در مرحلهٔ «{currentStatus}» مانده؛ مهلت تنظیم‌شدهٔ این مرحله {currentStage?.stalledAfterDays?.toLocaleString('fa-IR')} روز است.
          </div>
        )}
        <div className="details">
          <span>کد ملی<b>{person.nationalId}</b></span>
          <span>تاریخ تولد<b>{person.birthDate}</b></span>
          <span>نام پدر<b>{person.fatherName}</b></span>
          <span>ثبت‌کننده<b>{person.updatedBy}</b></span>
          <span>ارجاع‌شده به<b>{assignedUser ? assignedUser.name : person.assignee || '—'}</b></span>
          <span>
            مهلت پیگیری
            <b>
              {person.deadline ?? '—'}
              {dLeft !== null && (
                <i className={`dl-chip ${dLeft < 0 ? 'over' : dLeft <= 3 ? 'warn' : 'ok'}`}>
                  {dLeft < 0 ? `${Math.abs(dLeft).toLocaleString('fa-IR')} روز گذشته` : dLeft === 0 ? 'سررسید امروز' : `${dLeft.toLocaleString('fa-IR')} روز مانده`}
                </i>
              )}
            </b>
          </span>
        </div>
        <h3 className="modal-h">مراحل گردش‌کار</h3>
        <div className="steps-list">
          {stages.map((stage, i) => (
            <div className={`step-item ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`} key={stage.id}>
              <i>{(i + 1).toLocaleString('fa-IR')}</i>
              <span>{stage.label}{stage.archived ? ' (بایگانی)' : ''}</span>
              {i === currentIndex && <em>وضعیت فعلی</em>}
            </div>
          ))}
        </div>
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">چک‌لیست مرحلهٔ «{currentStatus}»</h3>
            <small className="text-xs text-slate-500 dark:text-slate-400">{(currentStage?.checklist.length ?? 0) - missingChecklist.length} از {currentStage?.checklist.length ?? 0} مورد</small>
          </div>
          {!currentStage?.checklist.length ? (
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">مدیر برای این مرحله چک‌لیستی تعریف نکرده است.</p>
          ) : (
            <div className="space-y-2">
              {currentStage.checklist.map(rule => {
                const mark = checklistMarks[rule.id]
                const checked = Boolean(mark?.done)
                return (
                  <label key={rule.id} className="flex min-w-0 items-start gap-3 rounded-lg bg-white p-2.5 text-sm dark:bg-slate-900">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
                      checked={checked}
                      disabled={!canCompleteChecklist || checked}
                      onChange={event => onChecklistToggle(person, currentStageId, rule.id, event.target.checked)}
                    />
                    <span className="min-w-0 flex-1">
                      <b className={cn('block font-medium', checked ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100')}>{rule.label}</b>
                      {checked && <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">ثبت تکمیل توسط {mark?.checkedBy || 'کاربر'} · {formatServerTimestamp(mark?.checkedAt ?? '')}</small>}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
          {missingChecklist.length > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              برای انتقال، ابتدا موارد ناقص را تکمیل کنید: {missingChecklist.map(item => item.label).join('، ')}
            </p>
          )}
        </section>
        {canChange
          ? options.length
            ? (
              <label>
                مرحلهٔ مقصد
                <select value={targetStageId} onChange={e => setTargetStageId(e.target.value)}>
                  <option value={currentStageId}>{currentStatus} (فعلی)</option>
                  {options.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                </select>
              </label>
            )
            : <div className="modal-note">این پرونده در مرحلهٔ پایانی قرار دارد.</div>
          : canChange ? null : !canAssign && !canCompleteChecklist ? <div className="modal-note">شما دسترسی تغییر مرحله یا عملیات این پرونده را ندارید؛ این صفحه فقط برای مشاهده است.</div> : null}
        {canAssign && (
          <label className="assign-label">
            ارجاع پرونده به کاربر
            <select value={person.assignee ?? ''} onChange={e => onAssign(person, e.target.value)}>
              <option value="">بدون ارجاع</option>
              {usersList.filter(u => u.active).map(u => <option key={u.username} value={u.username}>{u.name} — {u.title}</option>)}
            </select>
          </label>
        )}
        {canChange && needsReason && (
          <label>
            علت رد اجباری
            <textarea required value={reason} onChange={e => setReason(e.target.value)} placeholder="علت رد پرونده را وارد کنید..." />
          </label>
        )}
        {(canViewPersonNotes || canViewHistory) && <div className="modal-tabs" role="group" aria-label="بخش‌های پرونده">
          {canViewPersonNotes && <Button type="button" variant="tab" size="sm" active={activeTab === 'chat'} className={activeTab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
            گفتگو {notes.length > 0 && <small>({notes.length.toLocaleString('fa-IR')})</small>}
          </Button>}
          {canViewHistory && <Button type="button" variant="tab" size="sm" active={activeTab === 'history'} className={activeTab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
            تاریخچه پرونده {history.length > 0 && <small>({history.length.toLocaleString('fa-IR')})</small>}
          </Button>}
        </div>}
        {canViewPersonNotes && activeTab === 'chat' && (
          <>
            <div className="chat" ref={chatRef}>
              {notes.map(note => (
                <div className={`msg ${ownsNote(note) ? 'mine' : ''}`} key={note.id}>
                  <header>
                    <b>{note.author}</b>
                    {note.role === 'admin' && <em className="role-chip">مدیر</em>}
                    <small>{note.title} · {formatServerTimestamp(note.createdAt, note.ts)}{note.edited ? ' · (ویرایش‌شده)' : ''}</small>
                    {canCreateNote && <span className="msg-tools flex items-center gap-1">
                      <Button type="button" variant="ghost" size="xs" title="پاسخ به یادداشت" aria-label="پاسخ به یادداشت" onClick={() => setReplyTo(note)}>پاسخ</Button>
                    </span>}
                    {(ownsNote(note) || canManageAnyNote) && (canEditNotes || canDeleteNotes) && (
                      <span className="msg-tools flex items-center gap-1">
                        {canEditNotes && <Button type="button" variant="ghost" size="xs" title="ویرایش یادداشت" aria-label="ویرایش یادداشت" onClick={() => { setEditingNote(note.id); setEditText(note.text) }}>ویرایش</Button>}
                        {canDeleteNotes && <Button type="button" variant="dangerGhost" size="xs" title="حذف یادداشت" aria-label="حذف یادداشت" onClick={() => onDeleteNote(note.id)}>حذف</Button>}
                      </span>
                    )}
                  </header>
                  {note.replyTo && (
                    <div className="msg-quote">
                      <b>{note.replyTo.author}:</b> {note.replyTo.text.length > 80 ? `${note.replyTo.text.slice(0, 80)}…` : note.replyTo.text}
                    </div>
                  )}
                  {editingNote === note.id ? (
                    <div className="note-edit">
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} />
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditingNote(null)}>انصراف</Button>
                        <Button type="button" variant="primary" size="sm" disabled={!editText.trim()} onClick={saveNoteEdit}>ذخیره</Button>
                      </div>
                    </div>
                  ) : <p>{renderText(note.text)}</p>}
                </div>
              ))}
              {!notes.length && <div className="chat-empty">هنوز یادداشتی ثبت نشده؛ اولین نکته را بنویسید تا تیم و مدیر پاسخ بدهند.</div>}
            </div>
            {canCreateNote && replyTo && (
              <div className="reply-bar">
                <span>پاسخ به <b>{replyTo.author}</b>: {replyTo.text.length > 60 ? `${replyTo.text.slice(0, 60)}…` : replyTo.text}</span>
                <Button type="button" variant="dangerGhost" size="xs" onClick={() => setReplyTo(null)} title="لغو پاسخ">لغو پاسخ</Button>
              </div>
            )}
            {canCreateNote && suggestions.length > 0 && (
              <div className="mention-sug">
                {suggestions.map(u => <Button variant="soft" size="xs" type="button" key={u.username} onClick={() => insertMention(u.name)}>@{u.name}</Button>)}
              </div>
            )}
            {canCreateNote && <div className="composer">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submitNote()
                  }
                }}
                placeholder="نظر یا نکته‌ای بنویسید... (با @ کاربران را منشن کنید)"
              />
              <Button type="button" variant="primary" size="sm" className="w-full sm:w-auto" disabled={!noteText.trim()} onClick={submitNote}>ارسال</Button>
            </div>}
          </>
        )}
        {canViewHistory && (!canViewPersonNotes || activeTab === 'history') && <div className="timeline">
            {history.map(a => (
              <div className="tl-item" key={a.id}>
                <div>
                  <b>{a.action}</b>
                  {a.previousStatus && a.newStatus && <span className="tl-change">از «{a.previousStatus}» به «{a.newStatus}»</span>}
                  {a.rejectionReason && (
                    <span className="tl-reason">
                      {a.action === 'رد پرونده' ? `علت رد: ${a.rejectionReason}` : a.action === 'ویرایش اطلاعات فرد' ? `فیلدهای تغییرکرده: ${a.rejectionReason}` : a.rejectionReason}
                    </span>
                  )}
                  <small>{a.createdBy} · {formatServerTimestamp(a.createdAt, a.ts)}</small>
                </div>
              </div>
            ))}
            {!history.length && <div className="chat-empty">هنوز رویدادی برای این پرونده ثبت نشده.</div>}
          </div>}
        <div className="modal-actions">
          {canPrint && <Button type="button" variant="outline" onClick={() => window.print()}>چاپ</Button>}
          <Button type="button" variant="outline" onClick={onClose}> بستن</Button>
          {canEdit && <Button type="button" variant="outline" onClick={() => onEdit(person)}> ویرایش اطلاعات</Button>}
          {canDelete && <Button type="button" variant="danger" onClick={() => onDelete(person)}> حذف پرونده</Button>}
          {canChange && (
            <Button
              type="button"
              variant="primary"
              disabled={targetStageId === currentStageId || missingChecklist.length > 0 || (needsReason && !reason.trim()) || !targetStage}
              onClick={() => onUpdate(person, targetStageId, needsReason ? reason : null)}
            >
               ذخیره تغییرات
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
