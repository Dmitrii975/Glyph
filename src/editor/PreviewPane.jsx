import { useEffect, useMemo, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import Icon from './icons.jsx'
import { createExtensions } from './extensions.js'

export default function PreviewPane({ file, onClose }) {
  const extensions = useMemo(() => createExtensions(), [])
  const seen = useRef(file.content)
  const editor = useEditor({
    extensions,
    content: file.content,
    contentType: 'markdown',
    editable: false,
    editorProps: { attributes: { class: 'tiptap' } },
  })

  useEffect(() => {
    if (!editor || seen.current === file.content) return
    seen.current = file.content
    editor.commands.setContent(file.content, { contentType: 'markdown', emitUpdate: false })
  }, [editor, file.content])

  return (
    <section className="preview" aria-label="Просмотр контекста">
      <header className="preview-bar">
        <div className="preview-title">
          <strong>{file.name}</strong>
          <span>Только чтение</span>
        </div>
        <button type="button" className="icon-button" aria-label="Закрыть просмотр" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <EditorContent className="editor-content" editor={editor} />
    </section>
  )
}
