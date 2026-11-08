import { useEffect, useRef } from 'react'
import { useEditorState } from '@tiptap/react'

export default function FindBar({ editor, onClose }) {
  const inputRef = useRef(null)
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const storage = current.storage.findAndReplace || {}
      return {
        searchTerm: storage.searchTerm || '',
        replaceTerm: storage.replaceTerm || '',
        caseSensitive: Boolean(storage.caseSensitive),
        count: storage.results?.length || 0,
        currentIndex: storage.currentIndex ?? null,
      }
    },
  })

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function close() {
    editor.commands.clearSearch()
    onClose()
  }

  const position = state?.currentIndex == null || !state.count ? 0 : state.currentIndex + 1

  return (
    <form
      className="find-bar"
      onSubmit={(event) => {
        event.preventDefault()
        editor.commands.goToNextResult()
      }}
    >
      <input
        ref={inputRef}
        aria-label="Найти"
        placeholder="Найти"
        value={state?.searchTerm || ''}
        onChange={(event) => editor.commands.setSearchTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            close()
          }
        }}
      />
      <span className="find-count">{state?.count ? `${position} / ${state.count}` : '0'}</span>
      <button type="button" onClick={() => editor.commands.goToPreviousResult()}>Назад</button>
      <button type="button" onClick={() => editor.commands.goToNextResult()}>Дальше</button>
      <input
        aria-label="Заменить на"
        placeholder="Заменить на"
        value={state?.replaceTerm || ''}
        onChange={(event) => editor.commands.setReplaceTerm(event.target.value)}
      />
      <button type="button" onClick={() => editor.commands.replace()}>Заменить</button>
      <button type="button" onClick={() => editor.commands.replaceAll()}>Все</button>
      <button
        type="button"
        className={state?.caseSensitive ? 'is-active' : ''}
        onClick={() => editor.commands.setCaseSensitive(!state?.caseSensitive)}
      >
        Аа
      </button>
      <button type="button" onClick={close}>Закрыть</button>
    </form>
  )
}
