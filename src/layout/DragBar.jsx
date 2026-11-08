export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export default function DragBar({ axis, label, onDrag }) {
  function onPointerDown(event) {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const start = axis === 'x' ? event.clientX : event.clientY
    function move(next) {
      const current = axis === 'x' ? next.clientX : next.clientY
      onDrag(current - start)
    }
    function up() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      className={axis === 'x' ? 'drag drag-x' : 'drag drag-y'}
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-label={label}
      onPointerDown={onPointerDown}
    />
  )
}
