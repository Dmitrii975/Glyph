const id = { type: 'string', description: 'id блока из оглавления' }
const markdown = { type: 'string', description: 'Фрагмент Markdown: один или несколько блоков верхнего уровня' }

function tool(name, description, properties, required) {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: { type: 'object', properties, required },
    },
  }
}

export const TOOLS = [
  tool('get_outline', 'Свежее оглавление документа: id, тип и короткий текст каждого блока верхнего уровня.', {}, []),
  tool(
    'read_blocks',
    'Полный Markdown блоков по id. Вызывай перед точной правкой, если в оглавлении текст обрезан или его мало.',
    { ids: { type: 'array', items: { type: 'string' }, description: 'id блоков' } },
    ['ids'],
  ),
  tool(
    'replace_block',
    'Заменить один блок верхнего уровня. Список, цитата и таблица — это один блок. Не используй, чтобы переписать весь документ.',
    { id, markdown },
    ['id', 'markdown'],
  ),
  tool(
    'insert_blocks',
    'Вставить блоки Markdown относительно существующего блока или в начало либо конец документа.',
    {
      place: { type: 'string', enum: ['before', 'after', 'start', 'end'] },
      id: { type: 'string', description: 'id ориентира. Нужен для before и after' },
      markdown,
    },
    ['place', 'markdown'],
  ),
  tool(
    'delete_blocks',
    'Удалить блоки верхнего уровня по id.',
    { ids: { type: 'array', items: { type: 'string' } } },
    ['ids'],
  ),
  tool(
    'set_table_cell',
    'Записать текст в одну ячейку. row и col начинаются с нуля. Переносы строки станут абзацами внутри ячейки.',
    {
      tableId: id,
      row: { type: 'integer' },
      col: { type: 'integer' },
      text: { type: 'string' },
    },
    ['tableId', 'row', 'col', 'text'],
  ),
  tool(
    'edit_table',
    'Изменить структуру таблицы. Для merge_cells укажи вторую ячейку endRow и endCol.',
    {
      tableId: id,
      op: {
        type: 'string',
        enum: [
          'add_row_before',
          'add_row_after',
          'delete_row',
          'add_column_before',
          'add_column_after',
          'delete_column',
          'merge_cells',
          'split_cell',
        ],
      },
      row: { type: 'integer' },
      col: { type: 'integer' },
      endRow: { type: 'integer' },
      endCol: { type: 'integer' },
    },
    ['tableId', 'op', 'row', 'col'],
  ),
]

export function toolLabel(name) {
  switch (name) {
    case 'get_outline': return 'Смотрю структуру'
    case 'read_blocks': return 'Читаю блоки'
    case 'replace_block': return 'Заменяю блок'
    case 'insert_blocks': return 'Вставляю текст'
    case 'delete_blocks': return 'Удаляю блоки'
    case 'set_table_cell': return 'Правлю ячейку'
    case 'edit_table': return 'Меняю таблицу'
    default: return 'Шаг'
  }
}
