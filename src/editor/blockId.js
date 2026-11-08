import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'table',
  'horizontalRule',
  'image',
]

const blockTypes = new Set(BLOCK_TYPES)
const key = new PluginKey('blockId')

function newId() {
  return crypto.randomUUID().slice(0, 8)
}

function assignIds(state) {
  let tr = state.tr
  const seen = new Set()
  const pending = []
  state.doc.descendants((node, pos) => {
    if (!blockTypes.has(node.type.name)) return
    const id = node.attrs.id
    if (id && !seen.has(id)) {
      seen.add(id)
      return
    }
    pending.push({ pos, attrs: node.attrs })
  })
  if (!pending.length) return null
  pending.sort((a, b) => b.pos - a.pos)
  for (const item of pending) {
    const nextId = newId()
    tr = tr.setNodeMarkup(tr.mapping.map(item.pos), undefined, { ...item.attrs, id: nextId })
  }
  tr.setMeta('blockId', true)
  tr.setMeta('addToHistory', false)
  return tr
}

export const BlockId = Extension.create({
  name: 'blockId',
  addGlobalAttributes() {
    return [
      {
        types: BLOCK_TYPES,
        attributes: {
          id: {
            default: null,
            rendered: false,
            keepOnSplit: false,
            parseHTML: () => null,
            renderHTML: () => ({}),
          },
        },
      },
    ]
  },
  onCreate() {
    const tr = assignIds(this.editor.state)
    if (tr) this.editor.view.dispatch(tr)
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((transaction) => transaction.docChanged)) return null
          if (transactions.some((transaction) => transaction.getMeta('blockId'))) return null
          return assignIds(state)
        },
      }),
    ]
  },
})
