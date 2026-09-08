import { useState } from 'react'
import { normalizeText } from '../../shared'
import { Avatar, Icon } from '../../shared-ui'
import type { Person, Activity, Note } from '../../types'
import { Badge } from '../common/Badge'

export function SearchModal({
  people,
  activities,
  notes,
  onClose,
  onPickPerson,
}: {
  people: Person[]
  activities: Activity[]
  notes: Note[]
  onClose: () => void
  onPickPerson: (p: Person) => void
}) {
  const [q, setQ] = useState('')
  const nq = normalizeText(q)

  const matchedPeople = nq
    ? people.filter(p => normalizeText(`${p.firstName} ${p.lastName} ${p.fatherName} ${p.nationalId} ${p.id}`).includes(nq)).slice(0, 5)
    : []

  const matchedNotes = nq
    ? notes.filter(n => normalizeText(`${n.text} ${n.author} ${n.title}`).includes(nq)).slice(0, 4)
    : []

  const matchedActs = nq
    ? activities.filter(a => normalizeText(`${a.action} ${a.personName} ${a.createdBy} ${a.rejectionReason ?? ''}`).includes(nq)).slice(0, 4)
    : []

  const personOf = (id: string) => people.find(p => p.id === id)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      if (matchedPeople.length > 0) {
        onPickPerson(matchedPeople[0])
      } else if (matchedNotes.length > 0) {
        const p = personOf(matchedNotes[0].personId)
        if (p) onPickPerson(p)
      } else if (matchedActs.length > 0) {
        const p = personOf(matchedActs[0].personId)
        if (p) onPickPerson(p)
      }
    }
  }

  return (
    <div className="backdrop search-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-input-row">
          <Icon name="search" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="جستجو در افراد، یادداشت‌ها و رویدادها..."
          />
          <kbd onClick={onClose} style={{ cursor: 'pointer' }}>Esc</kbd>
        </div>
        {!nq && <div className="empty">برای جستجو تایپ کنید — با Ctrl+K از هر جای سامانه باز می‌شود</div>}
        {nq && !matchedPeople.length && !matchedNotes.length && !matchedActs.length && (
          <div className="empty">نتیجه‌ای پیدا نشد</div>
        )}
        {matchedPeople.length > 0 && <h5>افراد ({matchedPeople.length.toLocaleString('fa-IR')})</h5>}
        {matchedPeople.map(p => (
          <button key={p.id} type="button" className="search-hit" onClick={() => onPickPerson(p)}>
            <Avatar text={p.firstName[0]} src={p.photo} size={28} />
            <span>
              <b>{p.firstName} {p.lastName}</b>
              <small>{p.nationalId} · {p.id} · پدر: {p.fatherName}</small>
            </span>
            <Badge status={p.status} />
          </button>
        ))}
        {matchedNotes.length > 0 && <h5>یادداشت‌ها ({matchedNotes.length.toLocaleString('fa-IR')})</h5>}
        {matchedNotes.map(n => (
          <button
            key={n.id}
            type="button"
            className="search-hit"
            onClick={() => {
              const p = personOf(n.personId)
              if (p) onPickPerson(p)
            }}
          >
            <span className="search-ico">💬</span>
            <span>
              <b>{n.author}</b>
              <small>{n.text.length > 70 ? `${n.text.slice(0, 70)}…` : n.text}</small>
            </span>
          </button>
        ))}
        {matchedActs.length > 0 && <h5>رویدادها ({matchedActs.length.toLocaleString('fa-IR')})</h5>}
        {matchedActs.map(a => (
          <button
            key={a.id}
            type="button"
            className="search-hit"
            onClick={() => {
              const p = personOf(a.personId)
              if (p) onPickPerson(p)
            }}
          >
            <span className="search-ico">↺</span>
            <span>
              <b>{a.action}</b>
              <small>{a.personName} · {a.createdBy} · {a.createdAt}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
