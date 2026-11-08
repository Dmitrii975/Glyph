const ALIGNMENTS = new Set(['left', 'center', 'right', 'justify'])

const MARK_TAGS = {
  bold: 'strong',
  italic: 'em',
  strike: 's',
  code: 'code',
  underline: 'u',
  highlight: 'mark',
  superscript: 'sup',
  subscript: 'sub',
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

function textOf(node) {
  if (!node) return ''
  if (node.type === 'text') return node.text || ''
  return (node.content || []).map(textOf).join('')
}

function alignOf(node) {
  const align = node.attrs?.textAlign
  return ALIGNMENTS.has(align) ? align : null
}

function alignAttr(node) {
  const align = alignOf(node)
  return align ? ` style="text-align: ${align}"` : ''
}

function renderInlineHtml(nodes = []) {
  return nodes.map((node) => {
    if (node.type === 'hardBreak') return '<br>'
    if (node.type !== 'text') return ''
    let html = escapeHtml(node.text || '')
    const marks = node.marks || []
    for (let index = marks.length - 1; index >= 0; index -= 1) {
      const mark = marks[index]
      if (mark.type === 'link') {
        const href = escapeAttr(mark.attrs?.href || '')
        html = `<a href="${href}">${html}</a>`
      } else if (MARK_TAGS[mark.type]) {
        const tag = MARK_TAGS[mark.type]
        html = `<${tag}>${html}</${tag}>`
      }
    }
    return html
  }).join('')
}

export function renderBlockHtml(node) {
  if (!node) return ''
  switch (node.type) {
    case 'paragraph':
      return `<p${alignAttr(node)}>${renderInlineHtml(node.content)}</p>`
    case 'heading': {
      const level = node.attrs?.level || 1
      return `<h${level}${alignAttr(node)}>${renderInlineHtml(node.content)}</h${level}>`
    }
    case 'bulletList':
      return `<ul>${(node.content || []).map(renderBlockHtml).join('')}</ul>`
    case 'orderedList':
      return `<ol>${(node.content || []).map(renderBlockHtml).join('')}</ol>`
    case 'listItem':
      return `<li>${(node.content || []).map(renderBlockHtml).join('')}</li>`
    case 'taskList':
      return `<ul data-type="taskList">${(node.content || []).map(renderBlockHtml).join('')}</ul>`
    case 'taskItem': {
      const checked = node.attrs?.checked ? 'true' : 'false'
      const inner = (node.content || []).map(renderBlockHtml).join('')
      return `<li data-type="taskItem" data-checked="${checked}"><div>${inner}</div></li>`
    }
    case 'blockquote':
      return `<blockquote>${(node.content || []).map(renderBlockHtml).join('')}</blockquote>`
    case 'codeBlock': {
      const language = node.attrs?.language
      const klass = language ? ` class="language-${escapeAttr(language)}"` : ''
      return `<pre><code${klass}>${escapeHtml(textOf(node))}</code></pre>`
    }
    case 'horizontalRule':
      return '<hr>'
    case 'image': {
      const src = escapeAttr(node.attrs?.src || '')
      const alt = escapeAttr(node.attrs?.alt || '')
      return `<img src="${src}" alt="${alt}">`
    }
    default: {
      const children = (node.content || []).map(renderBlockHtml).join('')
      return children || escapeHtml(textOf(node))
    }
  }
}

function cellNeedsHtml(cell) {
  if ((cell.attrs?.colspan ?? 1) !== 1) return true
  if ((cell.attrs?.rowspan ?? 1) !== 1) return true
  const blocks = cell.content || []
  if (blocks.length !== 1 || blocks[0].type !== 'paragraph') return true
  return alignOf(blocks[0]) !== null
}

// GFM tables cannot store merges or several blocks in a cell.
// Those tables are written as HTML, which the markdown parser reads back.
export function tableNeedsHtml(node) {
  return (node.content || []).some((row) => (row.content || []).some(cellNeedsHtml))
}

export function renderTableHtml(node) {
  const rows = (node.content || []).map((row) => {
    const cells = (row.content || []).map((cell) => {
      const tag = cell.type === 'tableHeader' ? 'th' : 'td'
      const attrs = []
      const colspan = cell.attrs?.colspan ?? 1
      const rowspan = cell.attrs?.rowspan ?? 1
      if (colspan !== 1) attrs.push(`colspan="${colspan}"`)
      if (rowspan !== 1) attrs.push(`rowspan="${rowspan}"`)
      const inner = (cell.content || []).map(renderBlockHtml).join('') || '<p></p>'
      const attrText = attrs.length ? ` ${attrs.join(' ')}` : ''
      return `<${tag}${attrText}>${inner}</${tag}>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')
  return `\n<table><tbody>${rows}</tbody></table>\n`
}
