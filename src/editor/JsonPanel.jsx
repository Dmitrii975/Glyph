import { useEffect, useState } from 'react'
import { useEditorState } from '@tiptap/react'

export default function JsonPanel({ editor, onClose }) {
  const [copied, setCopied] = useState(false)
  const json = useEditorState({
    editor,
    selector: ({ editor: current }) => JSON.stringify(current.getJSON(), null, 2),
  })

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copy() {
    await navigator.clipboard.writeText(json || '')
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="json-backdrop" onMouseDown={onClose}>
      <section
        className="json-panel"
        role="dialog"
        aria-label="JSON документа"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>JSON документа</h2>
          <div>
            <button type="button" onClick={copy}>{copied ? 'Скопировано' : 'Копировать'}</button>
            <button type="button" onClick={onClose}>Закрыть</button>
          </div>
        </header>
        <pre>{json}</pre>
      </section>
    </div>
  )
}
