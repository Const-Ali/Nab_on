import { useEffect, useRef } from 'react'

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active = true) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return

    const focusable = () =>
      [...el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter(e => !e.hasAttribute('hidden') && e.tabIndex !== -1)

    const first = focusable()[0]
    first?.focus({ preventScroll: true })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const closeBtn = el.querySelector<HTMLButtonElement>('[data-close-modal]')
        closeBtn?.click()
        return
      }
      if (e.key !== 'Tab') return
      const nodes = focusable()
      if (!nodes.length) return
      const firstNode = nodes[0]
      const lastNode = nodes[nodes.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === firstNode) {
          e.preventDefault()
          lastNode.focus()
        }
      } else {
        if (document.activeElement === lastNode) {
          e.preventDefault()
          firstNode.focus()
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown as unknown as EventListener)
    return () => el.removeEventListener('keydown', handleKeyDown as unknown as EventListener)
  }, [active])

  return ref
}
