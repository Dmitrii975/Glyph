import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import { Table, TableKit, renderTableToMarkdown } from '@tiptap/extension-table'
import { Markdown } from '@tiptap/markdown'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Placeholder } from '@tiptap/extension-placeholder'
import FindAndReplace from '@tiptap/extension-find-and-replace'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import { renderBlockHtml, renderTableHtml, tableNeedsHtml } from './markdownHtml.js'
import { BlockId } from './blockId.js'
import { AiHighlight } from './aiHighlight.js'

const AlignParagraph = Paragraph.extend({
  renderMarkdown(node, helpers, context) {
    if (!node?.attrs?.textAlign) return this.parent?.(node, helpers, context) ?? ''
    return renderBlockHtml(node)
  },
})

const AlignHeading = Heading.extend({
  renderMarkdown(node, helpers) {
    if (!node?.attrs?.textAlign) return this.parent?.(node, helpers) ?? ''
    return renderBlockHtml(node)
  },
})

const HtmlSuperscript = Superscript.extend({
  renderMarkdown(node, helpers) {
    return `<sup>${helpers.renderChildren(node)}</sup>`
  },
})

const HtmlSubscript = Subscript.extend({
  renderMarkdown(node, helpers) {
    return `<sub>${helpers.renderChildren(node)}</sub>`
  },
})

const MarkdownTable = Table.extend({
  renderMarkdown(node, helpers) {
    if (tableNeedsHtml(node)) return renderTableHtml(node)
    return renderTableToMarkdown(node, helpers)
  },
})

export function createExtensions() {
  return [
    StarterKit.configure({
      link: false,
      paragraph: false,
      heading: false,
    }),
    AlignParagraph,
    AlignHeading,
    Link.configure({
      openOnClick: false,
      enableClickSelection: true,
      defaultProtocol: 'https',
    }),
    Highlight,
    HtmlSuperscript,
    HtmlSubscript,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({ table: false }),
    MarkdownTable.configure({ resizable: true }),
    Image,
    Placeholder.configure({
      placeholder: 'Начните писать или откройте файл Markdown',
    }),
    FindAndReplace.configure({ injectCSS: false }),
    BlockId,
    AiHighlight,
    Markdown.configure({
      markedOptions: { gfm: true },
    }),
  ]
}

export const initialMarkdown = `# Базовый редактор

Это **Tiptap**: обычный текст, *курсив*, ~~зачёркивание~~ и \`код\`.

Ссылка на [tiptap.dev](https://tiptap.dev).

## Таблица

| Колонка | Значение |
| ------- | -------- |
| A       | 1        |
`
