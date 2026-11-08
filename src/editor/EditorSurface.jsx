import { useEffect, useMemo, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { createExtensions } from './extensions.js'
import Menus from './Menus.jsx'
import { useWorkspace } from '../workspace/Workspace.jsx'

export default function EditorSurface() {
  const { activeId, getDocument, registerEditor, ignoreRef, markDirty, activeIdRef } = useWorkspace()
  const extensions = useMemo(() => createExtensions(), [])
  const loadedFor = useRef(null)
  const starting = getDocument(activeId)
  const editor = useEditor({
    extensions,
    content: starting?.snapshot || starting?.markdown || '',
    contentType: starting?.snapshot ? undefined : 'markdown',
    editorProps: { attributes: { class: 'tiptap' } },
    onUpdate({ transaction }) {
      if (ignoreRef.current || !transaction.docChanged) return
      if (transaction.getMeta('blockId')) return
      if (transaction.getMeta('addToHistory') === false) return
      markDirty(activeIdRef.current)
    },
  })

  useEffect(() => {
    registerEditor(editor || null)
    return () => registerEditor(null)
  }, [editor, registerEditor])

  useEffect(() => {
    if (!editor || !activeId) return
    if (loadedFor.current === activeId) return
    if (loadedFor.current == null) {
      loadedFor.current = activeId
      return
    }
    const doc = getDocument(activeId)
    if (!doc) return
    ignoreRef.current = true
    if (doc.snapshot) editor.commands.setContent(doc.snapshot, { emitUpdate: false })
    else editor.commands.setContent(doc.markdown ?? '', { emitUpdate: false, contentType: 'markdown' })
    ignoreRef.current = false
    loadedFor.current = activeId
  }, [editor, activeId, getDocument, ignoreRef])

  return (
    <div className="editor-pane">
      <EditorContent className="editor-content" editor={editor} />
      <Menus editor={editor} />
    </div>
  )
}
