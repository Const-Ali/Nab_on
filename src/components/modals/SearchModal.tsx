import { useState } from 'react'
import { normalizeText } from '../../shared'
import { Avatar, Icon } from '../../shared-ui'
import type { Person, Activity, Note } from '../../types'
import { Badge } from '../common/Badge'

export function SearchModal({ people, activities, notes, onClose, onPickPerson }: { people: Person[]; activities: Activity[]; notes: Note[]; onClose: () => void; onPickPerson: (p: Person) => void }) {
  const [q, setQ] = useState('')
  const nq = normalizeText(q)
  const matchedPeople = nq ? people.filter(p => normalizeText(`${p.firstName} ${p.lastName} ${p.nationalId} ${p.id}`).includes(nq)).slice(0, 5) : []
  const matchedNotes = nq ? notes.filter(n => normalizeText(`${n.text} ${n.author}`).includes(nq)).slice(0, 4) : []
  const matchedActs = nq ? activities.filter(a => normalizeText(`${a.action} ${a.personName} ${a.createdBy}`).includes(nq)).slice(0, 4) : []
  const personOf = (id: string) => people.find(p => p.id === id)
  return (
    <div className="backdrop search-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="search-modal">
        <div className="search-input-row">
          <Icon name="search" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') onClose() }} placeholder="جستجو در افراد، یادداشت‌ها و رویدادها..." />
          <kbd>Esc</kbd>
        </div>
        {!nq && <div className="empty">برای جستجو تایپ کنید — با Ctrl+K از هر جای سامانه باز می‌شود</div>}
        {nq && !matchedPeople.length && !matchedNotes.length && !matchedActs.length && <div className="empty">نتیجه‌ای پیدا نشد</div>}
        {matchedPeople.length > 0 && <h5>افراد</h5>}
        {matchedPeople.map(p => (
          <button key={p.id} className="search-hit" onClick={() => onPickPerson(p)}>
            <Avatar text={p.firstName[0]} src={p.photo} size={28} />
            <span><b>{p.firstName} {p.lastName}</b><small>{p.nationalId} · {p.id}</small></span>
            <Badge status={p.status} />
          </button>
        ))}
        {matchedNotes.length > 0 && <h5>یادداشت‌ها</h5>}
        {matchedNotes.map(n => (
          <button key={n.id} className="search-hit" onClick={() => { const p = personOf(n.personId); if (p) onPickPerson(p) }}>
            <span className="search-ico">💬</span>
            <span><b>{n.author}</b><small>{n.text.length > 70 ? `${n.text.slice(0, 70)}…` : n.text}</small></span>
          </button>
        ))}
        {matchedActs.length > 0 && <h5>رویدادها</h5>}
        {matchedActs.map(a => (
          <button key={a.id} className="search-hit" onClick={() => { const p = personOf(a.personId); if (p) onPickPerson(p) }}>
            <span className="search-ico">↺</span>
            <span><b>{a.action}</b><small>{a.personName} · {a.createdBy} · {a.createdAt}</small></span>
          </button>
        ))}
      </div>
    </div>
  )
}
