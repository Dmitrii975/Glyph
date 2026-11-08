import { useState } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import { CellSelection } from '@tiptap/pm/tables'
import { useEditorState } from '@tiptap/react'
import Icon from './icons.jsx'
import { LinkControls, ToolButton } from './Toolbar.jsx'

function showTextMenu({ editor, from, to, state }) {
  if (!editor.isEditable || from === to) return false
  if (state.selection instanceof CellSelection) return false
  if (editor.isActive('codeBlock') || editor.isActive('image')) return false
  return true
}

function showTableMenu({ editor, state }) {
  if (!editor.isEditable || !editor.isActive('table')) return false
  const { selection } = state
  return selection instanceof CellSelection || selection.empty
}

function TextMenu({ editor }) {
  const [linkOpen, setLinkOpen] = useState(false)
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      strike: current.isActive('strike'),
      code: current.isActive('code'),
      highlight: current.isActive('highlight'),
      link: current.isActive('link'),
      superscript: current.isActive('superscript'),
      subscript: current.isActive('subscript'),
    }),
  })

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="textBubbleMenu"
      shouldShow={showTextMenu}
      appendTo={() => document.body}
      updateDelay={0}
      options={{ placement: 'top', offset: 8 }}
      className="bubble-menu"
    >
      <ToolButton label="Жирный" active={state?.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Icon name="bold" />
      </ToolButton>
      <ToolButton label="Курсив" active={state?.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Icon name="italic" />
      </ToolButton>
      <ToolButton label="Зачёркнутый" active={state?.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Icon name="strike" />
      </ToolButton>
      <ToolButton label="Код" active={state?.code} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Icon name="code" />
      </ToolButton>
      <ToolButton label="Маркер" active={state?.highlight} onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <Icon name="highlight" />
      </ToolButton>
      <ToolButton
        label="Ссылка"
        active={state?.link || linkOpen}
        onClick={() => {
          setLinkOpen((open) => !open)
          requestAnimationFrame(() => editor.commands.setMeta('textBubbleMenu', 'updatePosition'))
        }}
      >
        <Icon name="link" />
      </ToolButton>
      <ToolButton label="Верхний индекс" active={state?.superscript} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
        <Icon name="superscript" />
      </ToolButton>
      <ToolButton label="Нижний индекс" active={state?.subscript} onClick={() => editor.chain().focus().toggleSubscript().run()}>
        <Icon name="subscript" />
      </ToolButton>
      {linkOpen ? <LinkControls editor={editor} onDone={() => setLinkOpen(false)} /> : null}
    </BubbleMenu>
  )
}

function TableMenu({ editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      rowBefore: current.can().addRowBefore(),
      rowAfter: current.can().addRowAfter(),
      deleteRow: current.can().deleteRow(),
      colBefore: current.can().addColumnBefore(),
      colAfter: current.can().addColumnAfter(),
      deleteCol: current.can().deleteColumn(),
      merge: current.can().mergeCells(),
      split: current.can().splitCell(),
      headerRow: current.can().toggleHeaderRow(),
      headerCol: current.can().toggleHeaderColumn(),
      headerCell: current.can().toggleHeaderCell(),
      deleteTable: current.can().deleteTable(),
    }),
  })

  function run(name) {
    editor.chain().focus()[name]().run()
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableBubbleMenu"
      shouldShow={showTableMenu}
      appendTo={() => document.body}
      updateDelay={0}
      options={{ placement: 'bottom', offset: 8 }}
      className="bubble-menu table-menu"
    >
      <ToolButton label="Строка выше" disabled={!state?.rowBefore} onClick={() => run('addRowBefore')}>
        <Icon name="rowAbove" />
      </ToolButton>
      <ToolButton label="Строка ниже" disabled={!state?.rowAfter} onClick={() => run('addRowAfter')}>
        <Icon name="rowBelow" />
      </ToolButton>
      <ToolButton label="Удалить строку" disabled={!state?.deleteRow} onClick={() => run('deleteRow')}>
        <Icon name="trash" />
      </ToolButton>
      <span className="bubble-gap" />
      <ToolButton label="Колонка слева" disabled={!state?.colBefore} onClick={() => run('addColumnBefore')}>
        <Icon name="colLeft" />
      </ToolButton>
      <ToolButton label="Колонка справа" disabled={!state?.colAfter} onClick={() => run('addColumnAfter')}>
        <Icon name="colRight" />
      </ToolButton>
      <ToolButton label="Удалить колонку" disabled={!state?.deleteCol} onClick={() => run('deleteColumn')}>
        <Icon name="trash" />
      </ToolButton>
      <span className="bubble-gap" />
      <ToolButton label="Объединить ячейки. Сначала выделите несколько" disabled={!state?.merge} onClick={() => run('mergeCells')}>
        <Icon name="merge" />
      </ToolButton>
      <ToolButton label="Разъединить ячейку" disabled={!state?.split} onClick={() => run('splitCell')}>
        <Icon name="split" />
      </ToolButton>
      <ToolButton label="Шапка строки" disabled={!state?.headerRow} onClick={() => run('toggleHeaderRow')}>
        <Icon name="headerRow" />
      </ToolButton>
      <ToolButton label="Шапка колонки" disabled={!state?.headerCol} onClick={() => run('toggleHeaderColumn')}>
        <Icon name="headerCol" />
      </ToolButton>
      <ToolButton label="Шапка ячейки" disabled={!state?.headerCell} onClick={() => run('toggleHeaderCell')}>
        <Icon name="headerCell" />
      </ToolButton>
      <span className="bubble-gap" />
      <ToolButton label="Удалить таблицу" disabled={!state?.deleteTable} onClick={() => run('deleteTable')}>
        <Icon name="trash" />
      </ToolButton>
    </BubbleMenu>
  )
}

export default function Menus({ editor }) {
  if (!editor) return null
  return (
    <>
      <TextMenu editor={editor} />
      <TableMenu editor={editor} />
    </>
  )
}
