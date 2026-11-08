import { TableMap } from '@tiptap/pm/tables'

const LABELS = {
  paragraph: 'абзац',
  heading: 'заголовок',
  bulletList: 'список',
  orderedList: 'нумерованный список',
  taskList: 'чек-лист',
  blockquote: 'цитату',
  codeBlock: 'блок кода',
  table: 'таблицу',
  image: 'картинку',
  horizontalRule: 'линию',
}

export function findTopLevel(doc, id) {
  let found = null
  doc.forEach((node, offset) => {
    if (found || node.attrs?.id !== id) return
    found = { node, pos: offset }
  })
  return found
}

export function blockLabel(node) {
  if (!node) return 'блок'
  if (node.type.name === 'heading') return `заголовок ${node.attrs.level || 1}`
  return LABELS[node.type.name] || 'блок'
}

export function outlineOf(doc) {
  const blocks = []
  doc.forEach((node) => {
    const text = node.textContent.replace(/\s+/g, ' ').trim()
    const item = {
      id: node.attrs?.id || null,
      type: node.type.name,
      preview: text.length > 180 ? `${text.slice(0, 180)}…` : text,
    }
    if (text.length > 180) item.truncated = true
    if (node.type.name === 'heading') item.level = node.attrs.level
    if (node.type.name === 'table') {
      const map = TableMap.get(node)
      item.rows = map.height
      item.cols = map.width
      const cells = []
      node.descendants((child) => {
        if (child.type.name === 'tableCell' || child.type.name === 'tableHeader') {
          cells.push(child.textContent.replace(/\s+/g, ' ').trim())
        }
      })
      const joined = cells.join(' | ')
      item.preview = joined.length > 180 ? `${joined.slice(0, 180)}…` : joined
    }
    blocks.push(item)
  })
  return blocks
}

export function selectionContext(editor) {
  const { selection, doc } = editor.state
  const block = selection.$from.depth >= 1 ? selection.$from.node(1) : null
  const selectedText = selection.empty
    ? ''
    : doc.textBetween(selection.from, selection.to, '\n').slice(0, 500)
  return {
    blockId: block?.attrs?.id || null,
    blockType: block ? blockLabel(block) : null,
    selectedText,
  }
}

export function blockMarkdown(editor, node) {
  return editor.markdown.serialize({ type: 'doc', content: [node.toJSON()] }).trim()
}

export function nodesFromMarkdown(editor, markdown) {
  const parsed = editor.markdown.parse(String(markdown ?? ''))
  const content = Array.isArray(parsed?.content) ? parsed.content : []
  if (!content.length) return [editor.schema.nodes.paragraph.create()]
  return content.map((item) => editor.schema.nodeFromJSON(item))
}
