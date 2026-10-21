import { Button } from '../common/Button'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../../shared-ui'
import { formatServerTimestamp } from '../../shared'
import { workflow, nextStatuses, personTags, STALE_LIMIT, deadlineLeft, staleDays } from '../../app-lib'
import type { Status, Person, Activity, User, Note } from '../../types'
import { Badge } from '../common/Badge'
import { backdropCls, cn, modalBox, modalFormLayout, personDetailLayout } from '../ui'

export function PersonModal({
  person,
  notes,
  history,
  meUsername,
  isAdmin,
  usersList,
  canChange,
  canDelete,
  canEdit,
  onClose,
  onUpdate,
  onDelete,
  onEdit,
  onAssign,
  onAddNote,
  onEditNote,
  onDeleteNote,
}: {
  person: Person
  notes: Note[]
  history: Activity[]
  meUsername: string
  isAdmin: boolean
  usersList: User[]
  canChange: boolean
  canDelete: boolean
  canEdit: boolean
  onClose: () => void
  onUpdate: (p: Person, s: Status, r: string | null) => void
  onDelete: (p: Person) => void
  onEdit: (p: Person) => void
  onAssign: (p: Person, username: string) => void
  onAddNote: (personId: string, text: string, replyTo?: { author: string; text: string }) => void
  onEditNote: (noteId: string, text: string) => void
  onDeleteNote: (noteId: string) => void
}) {
  const [status, setStatus] = useState(person.status)
  const [reason, setReason] = useState('')
  const options = nextStatuses[person.status] ?? []
  const [noteText, setNoteText] = useState('')
  const [tab, setTab] = useState<'chat' | 'history'>('chat')
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

  const dLeft = deadlineLeft(person)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [notes.length])

  const currentIndex = workflow.indexOf(person.status)
  const ownsNote = (note: Note) => note.authorUsername === meUsername || (!note.authorUsername && isAdmin)

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
      <div className={cn(modalBox, modalFormLayout, personDetailLayout, 'max-h-[calc(100vh-2rem)] max-w-5xl overflow-y-auto')} onClick={e => e.stopPropagation()}>
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
            <Badge status={person.status} />
            {(person.tags ?? []).map(t => <span className={`tag-chip sm ${personTags[t]}`} key={t}>{t}</span>)}
          </span>
        </div>
        {staleDays(person) >= STALE_LIMIT && (
          <div className="modal-note stale-note">
            ⏰ این پرونده {staleDays(person).toLocaleString('fa-IR')} روز است که در مرحله «{person.status}» متوقف مانده است.
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
          {workflow.map((s, i) => (
            <div className={`step-item ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`} key={s}>
              <i>{(i + 1).toLocaleString('fa-IR')}</i>
              <span>{s}</span>
              {i === currentIndex && <em>وضعیت فعلی</em>}
            </div>
          ))}
        </div>
        {canChange
          ? options.length
            ? (
              <label>
                مرحله بعدی
                <select value={status} onChange={e => setStatus(e.target.value as Status)}>
                  <option value={person.status}>{person.status} (فعلی)</option>
                  {options.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            )
            : <div className="modal-note">این پرونده در وضعیت نهایی قرار دارد.</div>
          : <div className="modal-note">شما دسترسی تغییر وضعیت ندارید؛ این صفحه فقط برای مشاهده است.</div>}
        {canChange && (
          <label className="assign-label">
            ارجاع پرونده به کاربر
            <select value={person.assignee ?? ''} onChange={e => onAssign(person, e.target.value)}>
              <option value="">بدون ارجاع</option>
              {usersList.filter(u => u.active).map(u => <option key={u.username} value={u.username}>{u.name} — {u.title}</option>)}
            </select>
          </label>
        )}
        {canChange && status === 'رد شده' && (
          <label>
            علت رد اجباری
            <textarea required value={reason} onChange={e => setReason(e.target.value)} placeholder="علت رد پرونده را وارد کنید..." />
          </label>
        )}
        <div className="modal-tabs" role="group" aria-label="بخش‌های پرونده">
          <Button type="button" variant="tab" size="sm" active={tab === 'chat'} className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
             گفتگو {notes.length > 0 && <small>({notes.length.toLocaleString('fa-IR')})</small>}
          </Button>
          <Button type="button" variant="tab" size="sm" active={tab === 'history'} className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
             تاریخچه پرونده {history.length > 0 && <small>({history.length.toLocaleString('fa-IR')})</small>}
          </Button>
        </div>
        {tab === 'chat' ? (
          <>
            <div className="chat" ref={chatRef}>
              {notes.map(note => (
                <div className={`msg ${ownsNote(note) ? 'mine' : ''}`} key={note.id}>
                  <header>
                    <b>{note.author}</b>
                    {note.role === 'admin' && <em className="role-chip">مدیر</em>}
                    <small>{note.title} · {formatServerTimestamp(note.createdAt, note.ts)}{note.edited ? ' · (ویرایش‌شده)' : ''}</small>
                    <span className="msg-tools flex items-center gap-1">
                      <Button type="button" variant="ghost" size="xs" title="پاسخ به یادداشت" aria-label="پاسخ به یادداشت" onClick={() => setReplyTo(note)}>پاسخ</Button>
                    </span>
                    {ownsNote(note) && (
                      <span className="msg-tools flex items-center gap-1">
                        <Button type="button" variant="ghost" size="xs" title="ویرایش یادداشت" aria-label="ویرایش یادداشت" onClick={() => { setEditingNote(note.id); setEditText(note.text) }}>ویرایش</Button>
                        <Button type="button" variant="dangerGhost" size="xs" title="حذف یادداشت" aria-label="حذف یادداشت" onClick={() => onDeleteNote(note.id)}>حذف</Button>
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
            {replyTo && (
              <div className="reply-bar">
                <span>پاسخ به <b>{replyTo.author}</b>: {replyTo.text.length > 60 ? `${replyTo.text.slice(0, 60)}…` : replyTo.text}</span>
                <Button type="button" variant="dangerGhost" size="xs" onClick={() => setReplyTo(null)} title="لغو پاسخ">لغو پاسخ</Button>
              </div>
            )}
            {suggestions.length > 0 && (
              <div className="mention-sug">
                {suggestions.map(u => <Button variant="soft" size="xs" type="button" key={u.username} onClick={() => insertMention(u.name)}>@{u.name}</Button>)}
              </div>
            )}
            <div className="composer">
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
            </div>
          </>
        ) : (
          <div className="timeline">
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
          </div>
        )}
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={() => window.print()}> چاپ</Button>
          <Button type="button" variant="outline" onClick={onClose}> بستن</Button>
          {canEdit && <Button type="button" variant="outline" onClick={() => onEdit(person)}> ویرایش اطلاعات</Button>}
          {canDelete && <Button type="button" variant="danger" onClick={() => onDelete(person)}> حذف پرونده</Button>}
          {canChange && (
            <Button
              type="button"
              variant="primary"
              disabled={status === person.status || (status === 'رد شده' && !reason.trim())}
              onClick={() => onUpdate(person, status, status === 'رد شده' ? reason : null)}
            >
               ذخیره تغییرات
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
