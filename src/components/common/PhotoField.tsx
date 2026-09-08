import { useRef, useState } from 'react'
import { Avatar, Icon } from '../../shared-ui'
import { imageToDataUrl } from '../../app-lib'

export function PhotoField({
  value,
  fallbackInitial,
  onChange,
}: {
  value: string
  fallbackInitial: string
  onChange: (dataUrl: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('فقط فایل تصویری (JPG, PNG, WebP) مجاز است.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('حجم عکس باید کمتر از ۲ مگابایت باشد.')
      return
    }
    setPhotoError('')
    imageToDataUrl(file)
      .then(onChange)
      .catch(() => setPhotoError('خواندن عکس ممکن نشد.'))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  return (
    <div
      className={`photo-field ${isDragging ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      title="برای انتخاب فایل کلیک کنید یا عکس را اینجا بکشید و رها کنید"
      style={{ cursor: 'pointer' }}
    >
      <Avatar text={fallbackInitial || 'ن'} src={value} size={64} />
      <div className="photo-actions" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-[7px]">
          <button type="button" className="mini-btn" onClick={() => fileRef.current?.click()}>
            <Icon name="camera" /> {value ? 'تغییر عکس' : 'انتخاب یا رها کردن عکس'}
          </button>
          {value && (
            <button type="button" className="mini-btn text-red-500" onClick={() => onChange('')}>
              حذف عکس
            </button>
          )}
        </div>
        <small>
          {isDragging
            ? '📂 تصویر را اینجا رها کنید...'
            : 'عکس را اینجا بکشید و رها کنید (Drag & Drop) یا کلیک کنید · JPG یا PNG تا ۲ مگابایت'}
        </small>
        {photoError && <em className="photo-error">{photoError}</em>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
