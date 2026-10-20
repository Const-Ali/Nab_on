import { Button } from './Button'
import { useRef, useState } from 'react'
import { Avatar } from '../../shared-ui'
import { imageToDataUrl } from '../../app-lib'
import { cn, errorBox } from '../ui'

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
      className={cn('flex cursor-pointer flex-col items-center gap-4 rounded-2xl border border-dashed p-4 text-center transition-all duration-200 sm:flex-row sm:text-right', isDragging ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30' : 'border-slate-300 bg-slate-50/70 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-900')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      title="برای انتخاب فایل کلیک کنید یا عکس را اینجا بکشید و رها کنید"
    >
      <Avatar text={fallbackInitial || 'ن'} src={value} size={64} />
      <div className="min-w-0 flex-1" onClick={e => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <Button type="button" variant="outline" size="xs" onClick={() => fileRef.current?.click()}>
            {value ? 'تغییر عکس' : 'انتخاب یا رها کردن عکس'}
          </Button>
          {value && (
            <Button type="button" variant="danger" size="xs" onClick={() => onChange('')}>
              حذف عکس
            </Button>
          )}
        </div>
        <small className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">
          {isDragging
            ? 'تصویر را اینجا رها کنید...'
            : 'عکس را اینجا بکشید و رها کنید (Drag & Drop) یا کلیک کنید · JPG یا PNG تا ۲ مگابایت'}
        </small>
        {photoError && <em className={cn(errorBox, 'mt-3 block text-right not-italic')}>{photoError}</em>}
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
