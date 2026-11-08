import { TextSelection } from '@tiptap/pm/state'
import { closeHistory } from '@tiptap/pm/history'
import {
  TableMap,
  CellSelection,
  addRowBefore,
  addRowAfter,
  deleteRow,
  addColumnBefore,
  addColumnAfter,
  deleteColumn,
  mergeCells,
  splitCell,
} from '@tiptap/pm/tables'
import { flashAiHighlight, scrollToBlock, setAiHighlight } from '../editor/aiHighlight.js'
import { blockLabel, blockMarkdown, findTopLevel, nodesFromMarkdown, outlineOf } from './document.js'

const TABLE_COMMANDS = {
  add_row_before: addRowBefore,
  add_row_after: addRowAfter,
  delete_row: deleteRow,
  add_column_before: addColumnBefore,
  add_column_after: addColumnAfter,
  delete_column: deleteColumn,
  merge_cells: mergeCells,
  split_cell: splitCell,
}

const TABLE_SUMMARY = {
  add_row_before: 'Добавил строку выше',
  add_row_after: 'Добавил строку ниже',
  delete_row: 'Удалил строку',
  add_column_before: 'Добавил колонку слева',
  add_column_after: 'Добавил колонку справа',
  delete_column: 'Удалил колонку',
  merge_cells: 'Объединил ячейки',
  split_cell: 'Разъединил ячейку',
}

function topIds(doc) {
  const ids = []
  doc.forEach((node) => {
    if (node.attrs?.id) ids.push(node.attrs.id)
  })
  return ids
}

function changed(editor, build) {
  const before = new Set(topIds(editor.state.doc))
  const tr = closeHistory(editor.state.tr)
  build(tr)
  editor.view.dispatch(tr)
  return topIds(editor.state.doc).filter((id) => !before.has(id))
}

function ok(editor, summary, highlightIds) {
  return { ok: true, summary, highlightIds, outline: outlineOf(editor.state.doc) }
}

function fail(error) {
  return { ok: false, error }
}

function idsOf(value) {
  if (!Array.isArray(value) || !value.length) return null
  if (value.some((item) => typeof item !== 'string' || !item.trim())) return null
  return value
}

function integer(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof number === 'number' && Number.isInteger(number) ? number : null
}

function requireEditor(editor) {
  if (!editor || editor.isDestroyed || !editor.view) return fail('Редактор недоступен')
  return null
}

// TableMap positions are offsets from the position just inside the table node.
function cellAt(doc, tableId, row, col) {
  const found = findTopLevel(doc, tableId)
  if (!found || found.node.type.name !== 'table') return fail('Таблица не найдена. Возьми tableId из оглавления.')
  const map = TableMap.get(found.node)
  if (row == null || col == null || row < 0 || col < 0 || row >= map.height || col >= map.width) {
    return fail(`Ячейка вне таблицы ${map.height}×${map.width}. Нумерация с нуля.`)
  }
  const pos = found.pos + 1 + map.positionAt(row, col, found.node)
  const cell = doc.nodeAt(pos)
  if (!cell) return fail('Ячейка не найдена')
  return { found, pos, cell, map }
}

function paragraphs(schema, text) {
  return String(text ?? '').split('\n').map((line) => (
    schema.nodes.paragraph.create(null, line ? schema.text(line) : null)
  ))
}

function runCommand(editor, selection, command) {
  const previous = editor.state.selection
  editor.view.dispatch(editor.state.tr.setSelection(selection).setMeta('addToHistory', false))
  let applied = false
  const success = command(editor.state, (tr) => {
    editor.view.dispatch(closeHistory(tr))
    applied = true
  })
  if (success && applied) return true
  if (!editor.isDestroyed) {
    editor.view.dispatch(editor.state.tr.setSelection(previous).setMeta('addToHistory', false))
  }
  return false
}

function readBlocks(editor, args) {
  const ids = idsOf(args.ids)
  if (!ids) return fail('Нужен список ids')
  const blocks = []
  for (const id of ids) {
    const found = findTopLevel(editor.state.doc, id)
    if (!found) return fail(`Блок ${id} не найден. Вызови get_outline.`)
    blocks.push({ id, type: found.node.type.name, markdown: blockMarkdown(editor, found.node) })
  }
  return { ok: true, readOnly: true, blocks }
}

function replaceBlock(editor, args) {
  if (typeof args.id !== 'string' || typeof args.markdown !== 'string') return fail('Нужны id и markdown')
  const found = findTopLevel(editor.state.doc, args.id)
  if (!found) return fail(`Блок ${args.id} не найден. Вызови get_outline.`)
  const nodes = nodesFromMarkdown(editor, args.markdown)
  const label = blockLabel(found.node)
  const highlightIds = changed(editor, (tr) => {
    tr.replaceWith(found.pos, found.pos + found.node.nodeSize, nodes)
  })
  return ok(editor, `Заменил ${label}`, highlightIds)
}

function insertBlocks(editor, args) {
  const place = args.place
  if (!['before', 'after', 'start', 'end'].includes(place)) return fail('place должен быть before, after, start или end')
  if (typeof args.markdown !== 'string') return fail('Нужен markdown')
  let pos = 0
  if (place === 'end') pos = editor.state.doc.content.size
  if (place === 'before' || place === 'after') {
    if (typeof args.id !== 'string') return fail('Для before и after нужен id')
    const found = findTopLevel(editor.state.doc, args.id)
    if (!found) return fail(`Блок ${args.id} не найден. Вызови get_outline.`)
    pos = place === 'before' ? found.pos : found.pos + found.node.nodeSize
  }
  const nodes = nodesFromMarkdown(editor, args.markdown)
  const highlightIds = changed(editor, (tr) => tr.insert(pos, nodes))
  return ok(editor, 'Вставил текст', highlightIds)
}

function deleteBlocks(editor, args) {
  const ids = idsOf(args.ids)
  if (!ids) return fail('Нужен список ids')
  const found = []
  for (const id of ids) {
    const block = findTopLevel(editor.state.doc, id)
    if (!block) return fail(`Блок ${id} не найден. Вызови get_outline.`)
    found.push(block)
  }
  found.sort((a, b) => b.pos - a.pos)
  changed(editor, (tr) => {
    for (const block of found) tr.delete(block.pos, block.pos + block.node.nodeSize)
  })
  const summary = found.length === 1 ? `Удалил ${blockLabel(found[0].node)}` : `Удалил блоки: ${found.length}`
  return ok(editor, summary, [])
}

function setTableCell(editor, args) {
  const row = integer(args.row)
  const col = integer(args.col)
  if (typeof args.tableId !== 'string' || typeof args.text !== 'string') return fail('Нужны tableId, row, col и text')
  const cell = cellAt(editor.state.doc, args.tableId, row, col)
  if (cell.ok === false) return cell
  const from = cell.pos + 1
  const to = cell.pos + cell.cell.nodeSize - 1
  const blocks = paragraphs(editor.schema, args.text)
  changed(editor, (tr) => tr.replaceWith(from, to, blocks))
  return ok(editor, `Поправил ячейку ${row + 1}×${col + 1}`, [args.tableId])
}

function editTable(editor, args) {
  const command = TABLE_COMMANDS[args.op]
  const row = integer(args.row)
  const col = integer(args.col)
  if (!command || typeof args.tableId !== 'string') return fail('Неизвестная операция таблицы')
  const anchor = cellAt(editor.state.doc, args.tableId, row, col)
  if (anchor.ok === false) return anchor
  let selection
  if (args.op === 'merge_cells') {
    const endRow = integer(args.endRow)
    const endCol = integer(args.endCol)
    const head = cellAt(editor.state.doc, args.tableId, endRow, endCol)
    if (head.ok === false) return head
    selection = CellSelection.create(editor.state.doc, anchor.pos + 1, head.pos + 1)
  } else {
    selection = TextSelection.near(editor.state.doc.resolve(anchor.pos + 1))
  }
  const applied = runCommand(editor, selection, command)
  if (!applied) return fail('Таблица не приняла эту операцию. Проверь ячейку и объединение.')
  return ok(editor, TABLE_SUMMARY[args.op], [args.tableId])
}

function execute(editor, name, args) {
  switch (name) {
    case 'get_outline':
      return { ok: true, readOnly: true, outline: outlineOf(editor.state.doc) }
    case 'read_blocks':
      return readBlocks(editor, args)
    case 'replace_block':
      return replaceBlock(editor, args)
    case 'insert_blocks':
      return insertBlocks(editor, args)
    case 'delete_blocks':
      return deleteBlocks(editor, args)
    case 'set_table_cell':
      return setTableCell(editor, args)
    case 'edit_table':
      return editTable(editor, args)
    default:
      return fail(`Неизвестный инструмент ${name}`)
  }
}

function targetIds(name, args) {
  if (!args || typeof args !== 'object') return []
  if (name === 'replace_block' || name === 'set_table_cell' || name === 'edit_table') {
    const id = args.id || args.tableId
    return typeof id === 'string' ? [id] : []
  }
  if ((name === 'insert_blocks') && (args.place === 'before' || args.place === 'after') && typeof args.id === 'string') {
    return [args.id]
  }
  if (name === 'delete_blocks' && Array.isArray(args.ids)) return args.ids.filter((id) => typeof id === 'string')
  return []
}

function paint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

export async function applyToolCall(editor, name, args) {
  const missing = requireEditor(editor)
  if (missing) return missing
  const targets = targetIds(name, args).filter((id) => findTopLevel(editor.state.doc, id))
  const writes = name !== 'get_outline' && name !== 'read_blocks'
  if (writes && targets.length) {
    setAiHighlight(editor, targets, 'target')
    scrollToBlock(editor, targets[0])
    await paint()
  }
  let result
  try {
    result = execute(editor, name, args || {})
  } catch (error) {
    setAiHighlight(editor, [], 'target')
    return fail(error.message || 'Не удалось применить правку')
  }
  if (!result.ok || result.readOnly) {
    setAiHighlight(editor, [], 'target')
    return result
  }
  const ids = (result.highlightIds || []).filter(Boolean)
  if (ids.length) flashAiHighlight(editor, ids)
  else setAiHighlight(editor, [], 'target')
  return result
}
