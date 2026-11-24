import { useEffect, useRef } from 'react'

export default function ConfirmationDialog({
  title,
  description,
  actions,
  onCancel,
  backdropClassName = '',
  dialogClassName = '',
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.querySelector('button')?.focus()
  }, [title])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  function handleKeyDown(event) {
    if (event.key === 'Escape' && onCancel) {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab') return

    const buttons = [...(dialogRef.current?.querySelectorAll('button:not(:disabled)') || [])]
    if (buttons.length === 0) return
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={`modal-backdrop ${backdropClassName}`.trim()} role="presentation">
      <section
        ref={dialogRef}
        className={`decision-modal ${dialogClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'confirmation-dialog-title' : undefined}
        aria-describedby="confirmation-dialog-description"
        onKeyDown={handleKeyDown}
      >
        {title && <h2 id="confirmation-dialog-title">{title}</h2>}
        <p id="confirmation-dialog-description">{description}</p>
        <div className="form-actions confirmation-dialog-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={action.variant === 'danger' ? 'primary destructive-button' : action.variant === 'primary' ? 'primary' : 'ghost-button'}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
