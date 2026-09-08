import { useRef, useState } from 'react'
import { Avatar, Icon } from '../../shared-ui'
import { imageToDataUrl } from '../../app-lib'

export function PhotoField({ value, fallbackInitial, onChange }: { value: string; fallbackInitial: string; onChange: (dataUrl: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState('')
  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setPhotoError('فقط فایل تصویری مجاز است.'); return }
    if (file.size > 2 * 1024 * 1024) { setPhotoError('حجم عکس باید کمتر از ۲ مگابایت باشد.'); return }
    setPhotoError('')
    imageToDataUrl(file).then(onChange).catch(() => setPhotoError('خواندن عکس ممکن نشد.'))
  }
  return (
    <div className="photo-field">
      <Avatar text={fallbackInitial || 'ن'} src={value} size={64} />
      <div className="photo-actions">
        <button type="button" className="mini-btn" onClick={() => fileRef.current?.click()}><Icon name="camera" /> {value ? 'تغییر عکس' : 'انتخاب عکس پرسنلی'}</button>
        {value && <button type="button" className="mini-btn" onClick={() => onChange('')}>حذف عکس</button>}
        <small>JPG یا PNG · حداکثر ۲ مگابایت · به‌صورت خودکار کوچک می‌شود</small>
        {photoError && <em className="photo-error">{photoError}</em>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}
