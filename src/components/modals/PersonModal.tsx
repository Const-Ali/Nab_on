import { useEffect, useRef, useState } from 'react'
import { Avatar, Icon } from '../../shared-ui'
import { workflow, nextStatuses, personTags, STALE_LIMIT, deadlineLeft, staleDays, timelineTone } from '../../app-lib'
import type { Status, Person, Activity, User, Note } from '../../types'
import { Badge } from '../common/Badge'

export function PersonModal({ person, notes, history, meName, usersList, canChange, canDelete, canEdit, onClose, onUpdate, onDelete, onEdit, onAssign, onAddNote, onEditNote, onDeleteNote }: { person: Person; notes: Note[]; history: Activity[]; meName: string; usersList: User[]; canChange: boolean; canDelete: boolean; canEdit: boolean; onClose: () => void; onUpdate: (p: Person, s: Status, r: string | null) => void; onDelete: (p: Person) => void; onEdit: (p: Person) => void; onAssign: (p: Person, username: string) => void; onAddNote: (personId: string, text: string, replyTo?: { author: string; text: string }) => void; onEditNote: (noteId: string, text: string) => void; onDeleteNote: (noteId: string) => void }) {
  const [status, setStatus] = useState(person.status)
  const [reason, setReason] = useState('')
  const options = nextStatuses[person.status] ?? []
  const [noteText, setNoteText] = useState('')
  const [tab, setTab] = useState<'chat' | 'history'>('chat')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const saveNoteEdit = () => { if (editingNote && editText.trim()) { onEditNote(editingNote, editText.trim()); setEditingNote(null) } }
  const [replyTo, setReplyTo] = useState<Note | null>(null)
  const mentionMatch = noteText.match(/@([^\s@]*)$/)
  const suggestions = mentionMatch ? usersList.filter(u => u.active && u.name.startsWith(mentionMatch[1])).slice(0, 4) : []
  const insertMention = (name: string) => setNoteText(cur => cur.replace(/@[^\s@]*$/, `@${name} `))
  const renderText = (text: string) => text.split(/(\s+)/).map((w, i) => (w.startsWith('@') && w.length > 1 ? <span key={i} className="mention">{w}</span> : w))
  const dLeft = deadlineLeft(person)
  const chatRef = useRef<HTMLDivElement>(null)
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }) }, [notes.length])
  const currentIndex = workflow.indexOf(person.status)
  const submitNote = () => { const text = noteText.trim(); if (!text) return; onAddNote(person.id, text, replyTo ? { author: replyTo.author, text: replyTo.text } : undefined); setNoteText(''); setReplyTo(null) }
  return (
    <div className="backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button type="button" className="x" onClick={onClose}><Icon name="close" /></button>
        <small>جزئیات فرد · {person.id}</small>
        <h2>{person.firstName} {person.lastName}</h2>
        <div className="summary"><Avatar text={person.firstName[0]} src={person.photo} size={44} /><span><b>{person.firstName} {person.lastName}</b><small>آخرین ثبت: {person.updatedAt} · {person.updatedBy}</small></span><span className="sum-side"><Badge status={person.status} />{(person.tags ?? []).map(t => <span className={`tag-chip sm ${personTags[t]}`} key={t}>{t}</span>)}</span></div>
        {staleDays(person) >= STALE_LIMIT && <div className="modal-note stale-note">⏰ این پرونده {staleDays(person).toLocaleString('fa-IR')} روز است که در مرحله «{person.status}» متوقف مانده است.</div>}
        <div className="details">
          <span>کد ملی<b>{person.nationalId}</b></span><span>تاریخ تولد<b>{person.birthDate}</b></span>
          <span>نام پدر<b>{person.fatherName}</b></span><span>ثبت‌کننده<b>{person.updatedBy}</b></span>
          <span>ارجاع‌شده به<b>{person.assignee ? usersList.find(u => u.username === person.assignee)?.name ?? '—' : '—'}</b></span>
          <span>مهلت پیگیری<b>{person.deadline ?? '—'}{dLeft !== null && <i className={`dl-chip ${dLeft < 0 ? 'over' : dLeft <= 3 ? 'warn' : 'ok'}`}>{dLeft < 0 ? `${Math.abs(dLeft).toLocaleString('fa-IR')} روز گذشته` : dLeft === 0 ? 'سررسید امروز' : `${dLeft.toLocaleString('fa-IR')} روز مانده`}</i>}</b></span>
        </div>
        <h3 className="modal-h">مراحل گردش‌کار</h3>
        <div className="steps-list">
          {workflow.map((s, i) => (
            <div className={`step-item ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`} key={s}>
              <i>{i < currentIndex ? '✓' : (i + 1).toLocaleString('fa-IR')}</i>
              <span>{s}</span>
              {i === currentIndex && <em>وضعیت فعلی</em>}
            </div>
          ))}
        </div>
        {canChange
          ? options.length
            ? <label>مرحله بعدی<select value={status} onChange={e => setStatus(e.target.value as Status)}><option value={person.status}>{person.status} (فعلی)</option>{options.map(s => <option key={s}>{s}</option>)}</select></label>
            : <div className="modal-note">این پرونده در وضعیت نهایی قرار دارد.</div>
          : <div className="modal-note">شما دسترسی تغییر وضعیت ندارید؛ این صفحه فقط برای مشاهده است.</div>}
        {canChange && (
          <label className="assign-label">ارجاع پرونده به کاربر
            <select value={person.assignee ?? ''} onChange={e => onAssign(person, e.target.value)}>
              <option value="">بدون ارجاع</option>
              {usersList.filter(u => u.active).map(u => <option key={u.username} value={u.username}>{u.name} — {u.title}</option>)}
            </select>
          </label>
        )}
        {canChange && status === 'رد شده' && <label>علت رد اجباری<textarea required value={reason} onChange={e => setReason(e.target.value)} placeholder="علت رد پرونده را وارد کنید..." /></label>}
        <div className="modal-tabs">
          <button type="button" className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>گفتگو {notes.length > 0 && <small>({notes.length.toLocaleString('fa-IR')})</small>}</button>
          <button type="button" className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>تاریخچه پرونده {history.length > 0 && <small>({history.length.toLocaleString('fa-IR')})</small>}</button>
        </div>
        {tab === 'chat' ? (
          <>
            <div className="chat" ref={chatRef}>
              {notes.map(note => (
                <div className={`msg ${note.author === meName ? 'mine' : ''}`} key={note.id}>
                  <header>
                    <b>{note.author}</b>{note.role === 'admin' && <em className="role-chip">مدیر</em>}
                    <small>{note.title} · {note.createdAt}{note.edited ? ' · (ویرایش‌شده)' : ''}</small>
                    <span className="msg-tools">
                      <button type="button" title="پاسخ" onClick={() => setReplyTo(note)}>↩</button>
                    </span>
                    {note.author === meName && (
                      <span className="msg-tools">
                        <button type="button" title="ویرایش" onClick={() => { setEditingNote(note.id); setEditText(note.text) }}><Icon name="edit" /></button>
                        <button type="button" title="حذف" onClick={() => onDeleteNote(note.id)}>✕</button>
                      </span>
                    )}
                  </header>
                  {note.replyTo && <div className="msg-quote"><b>{note.replyTo.author}:</b> {note.replyTo.text.length > 80 ? `${note.replyTo.text.slice(0, 80)}…` : note.replyTo.text}</div>}
                  {editingNote === note.id ? (
                    <div className="note-edit">
                      <textarea value={editText} onChange={e => setEditText(e.target.value)} />
                      <div>
                        <button type="button" className="mini-btn" onClick={() => setEditingNote(null)}>انصراف</button>
                        <button type="button" className="mini-btn" onClick={saveNoteEdit}>ذخیره</button>
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
                <button type="button" onClick={() => setReplyTo(null)} title="لغو پاسخ">✕</button>
              </div>
            )}
            {suggestions.length > 0 && (
              <div className="mention-sug">
                {suggestions.map(u => <button type="button" key={u.username} onClick={() => insertMention(u.name)}>@{u.name}</button>)}
              </div>
            )}
            <div className="composer">
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitNote() } }} placeholder="نظر یا نکته‌ای بنویسید... (با @ کاربران را منشن کنید)" />
              <button type="button" className="primary" disabled={!noteText.trim()} onClick={submitNote}>ارسال</button>
            </div>
          </>
        ) : (
          <div className="timeline">
            {history.map(a => (
              <div className="tl-item" key={a.id}>
                <i className={`tl-dot ${timelineTone(a)}`} />
                <div>
                  <b>{a.action}</b>
                  {a.previousStatus && a.newStatus && <span className="tl-change">از «{a.previousStatus}» به «{a.newStatus}»</span>}
                  {a.rejectionReason && <span className="tl-reason">{a.action === 'رد پرونده' ? `علت رد: ${a.rejectionReason}` : a.action === 'ویرایش اطلاعات فرد' ? `فیلدهای تغییرکرده: ${a.rejectionReason}` : a.rejectionReason}</span>}
                  <small>{a.createdBy} · {a.createdAt}</small>
                </div>
              </div>
            ))}
            {!history.length && <div className="chat-empty">هنوز رویدادی برای این پرونده ثبت نشده.</div>}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="outline" onClick={() => window.print()}><Icon name="printer" /> چاپ</button>
          <button type="button" className="outline" onClick={onClose}>بستن</button>
          {canEdit && <button type="button" className="outline" onClick={() => onEdit(person)}><Icon name="edit" /> ویرایش اطلاعات</button>}
          {canDelete && <button type="button" className="danger" onClick={() => onDelete(person)}>حذف پرونده</button>}
          {canChange && <button type="button" className="primary" disabled={status === person.status || (status === 'رد شده' && !reason.trim())} onClick={() => onUpdate(person, status, status === 'رد شده' ? reason : null)}><Icon name="check" /> ذخیره تغییرات</button>}
        </div>
      </div>
    </div>
  )
}
