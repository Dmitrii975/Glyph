import { outlineOf, selectionContext } from './document.js'

export const FILE_CHAR_LIMIT = 30_000
export const CONTEXT_CHAR_LIMIT = 80_000

const SYSTEM = `Ты помощник в редакторе Markdown. Отвечай на языке пользователя, коротко.

Документ собран из блоков с id. Меняй только то, что нужно, и только инструментами.
Не переписывай документ целиком и не вызывай цепочку замен по каждому абзацу, если хватает одной точечной правки.
Id бери из последнего оглавления или из ответа инструмента. Если id не найден, вызови get_outline, не угадывай.
Если в оглавлении текст обрезан, сначала прочитай блок через read_blocks.
Список, цитата, код и таблица — отдельные блоки верхнего уровня. Пункт списка сам по себе недоступен: чтобы поправить пункт, замени список.
Таблицу по ячейкам правь через set_table_cell, структуру — через edit_table. replace_block для таблицы используй только когда меняется вся таблица.
Файлы контекста даны как справка. Их нельзя менять инструментами: правь только открытый документ.
После правок одной-двумя фразами скажи, что изменилось.`

export function systemPrompt() {
  return SYSTEM
}

export function trimContext(files) {
  const used = []
  let total = 0
  for (const file of files) {
    if (total >= CONTEXT_CHAR_LIMIT) break
    let text = String(file.content || '')
    let note = ''
    if (text.length > FILE_CHAR_LIMIT) {
      text = text.slice(0, FILE_CHAR_LIMIT)
      note = '\n\n[Дальше файл обрезан.]'
    }
    if (total + text.length > CONTEXT_CHAR_LIMIT) {
      text = text.slice(0, CONTEXT_CHAR_LIMIT - total)
      note = '\n\n[Дальше файл обрезан по общему лимиту.]'
    }
    total += text.length
    used.push({ name: file.name, content: `${text}${note}` })
  }
  return used
}

export function buildUserMessage({ editor, task, contextDocs }) {
  const outline = outlineOf(editor.state.doc)
  const cursor = selectionContext(editor)
  const lines = ['Оглавление открытого документа:', JSON.stringify(outline)]
  if (cursor.blockId) lines.push(`Курсор в блоке ${cursor.blockId} (${cursor.blockType}).`)
  if (cursor.selectedText) lines.push(`Выделение:\n${cursor.selectedText}`)
  if (contextDocs.length) {
    lines.push('', 'Контекст, только для чтения:')
    for (const file of contextDocs) {
      lines.push('', `## ${file.name}`, file.content)
    }
  } else {
    lines.push('', 'Файлы контекста не выбраны.')
  }
  lines.push('', 'Запрос:', task)
  return lines.join('\n')
}
