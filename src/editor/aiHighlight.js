import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const aiHighlightKey = new PluginKey('aiHighlight')

let flashToken = 0

export const AiHighlight = Extension.create({
  name: 'aiHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiHighlightKey,
        state: {
          init: () => ({ ids: [], phase: 'target' }),
          apply(tr, value) {
            const meta = tr.getMeta(aiHighlightKey)
            return meta || value
          },
        },
        props: {
          decorations(state) {
            const current = aiHighlightKey.getState(state)
            if (!current?.ids?.length) return null
            const decorations = []
            const className = current.phase === 'done' ? 'ai-edit-done' : 'ai-edit-target'
            state.doc.forEach((node, offset) => {
              if (!current.ids.includes(node.attrs?.id)) return
              decorations.push(Decoration.node(offset, offset + node.nodeSize, { class: className }))
            })
            return decorations.length ? DecorationSet.create(state.doc, decorations) : null
          },
        },
      }),
    ]
  },
})

export function setAiHighlight(editor, ids, phase) {
  if (!editor || editor.isDestroyed) return
  editor.view.dispatch(
    editor.state.tr.setMeta(aiHighlightKey, { ids, phase }).setMeta('addToHistory', false),
  )
}

export function flashAiHighlight(editor, ids) {
  const token = ++flashToken
  setAiHighlight(editor, ids, 'done')
  window.setTimeout(() => {
    if (token === flashToken) setAiHighlight(editor, [], 'done')
  }, 1500)
}

export function scrollToBlock(editor, id) {
  if (!editor || editor.isDestroyed || !id) return
  let pos = null
  editor.state.doc.forEach((node, offset) => {
    if (pos != null) return
    if (node.attrs?.id === id) pos = offset
  })
  if (pos == null) return
  const dom = editor.view.nodeDOM(pos)
  if (dom instanceof Element && typeof dom.scrollIntoView === 'function') {
    dom.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}
