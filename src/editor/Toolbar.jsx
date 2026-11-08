import { useEffect, useRef, useState } from 'react'
import { useEditorState } from '@tiptap/react'
import Icon from './icons.jsx'

function ToolButton({ label, shortcut, active, disabled, onClick, children }) {
  const title = shortcut ? `${label} (${shortcut})` : label
  return (
    <button
      type="button"
      className={active ? 'icon-button is-active' : 'icon-button'}
      aria-label={label}
      aria-pressed={active || undefined}
      title={title}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function useToolbarState(editor) {
  return useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null
      const heading = [1, 2, 3, 4, 5, 6].find((level) => current.isActive('heading', { level })) || 0
      const align = ['left', 'center', 'right', 'justify'].find((value) => current.isActive({ textAlign: value })) || null
      return {
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
        heading,
        bullet: current.isActive('bulletList'),
        ordered: current.isActive('orderedList'),
        task: current.isActive('taskList'),
        quote: current.isActive('blockquote'),
        codeBlock: current.isActive('codeBlock'),
        bold: current.isActive('bold'),
        italic: current.isActive('italic'),
        strike: current.isActive('strike'),
        code: current.isActive('code'),
        underline: current.isActive('underline'),
        highlight: current.isActive('highlight'),
        link: current.isActive('link'),
        superscript: current.isActive('superscript'),
        subscript: current.isActive('subscript'),
        align,
      }
    },
  })
}

function Menu({ label, icon, active, open, onToggle, children, align }) {
  return (
    <div className="menu-wrap">
      <ToolButton label={label} active={active || open} onClick={onToggle}>
        <Icon name={icon} />
        <Icon name="chevron" className="chevron" />
      </ToolButton>
      {open ? <div className={align === 'right' ? 'menu-pop align-right' : 'menu-pop'} role="menu">{children}</div> : null}
    </div>
  )
}

function MenuItem({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={active ? 'menu-item is-active' : 'menu-item'}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function LinkControls({ editor, onDone }) {
  const current = editor.getAttributes('link').href || ''
  const [href, setHref] = useState(current || 'https://')

  function apply(event) {
    event.preventDefault()
    const next = href.trim()
    if (!next) editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: next }).run()
    onDone()
  }

  return (
    <form className="link-form" onSubmit={apply}>
      <input
        aria-label="Адрес ссылки"
        value={href}
        onChange={(event) => setHref(event.target.value)}
        onMouseDown={(event) => event.stopPropagation()}
      />
      <button type="submit">Ок</button>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          editor.chain().focus().extendMarkRange('link').unsetLink().run()
          onDone()
        }}
      >
        Убрать
      </button>
    </form>
  )
}

export default function Toolbar({ editor, theme, onToggleTheme, findOpen, onToggleFind, jsonOpen, onToggleJson }) {
  const barRef = useRef(null)
  const [open, setOpen] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const state = useToolbarState(editor)

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (!barRef.current?.contains(event.target)) setOpen(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function run(command) {
    if (!editor) return
    command()
    setOpen(null)
  }

  const disabled = !editor || !state
  const headingLabel = state?.heading ? `Заголовок ${state.heading}` : 'Абзац'

  return (
    <div className="toolbar" ref={barRef}>
      <div className="toolbar-group">
        <ToolButton label="Отменить" shortcut="Ctrl+Z" disabled={disabled || !state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
          <Icon name="undo" />
        </ToolButton>
        <ToolButton label="Повторить" shortcut="Ctrl+Shift+Z" disabled={disabled || !state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
          <Icon name="redo" />
        </ToolButton>
      </div>

      <div className="toolbar-group">
        <Menu
          label={headingLabel}
          icon="heading"
          active={Boolean(state?.heading)}
          open={open === 'heading'}
          onToggle={() => setOpen(open === 'heading' ? null : 'heading')}
        >
          <MenuItem active={!state?.heading} onClick={() => run(() => editor.chain().focus().setParagraph().run())}>
            Абзац
          </MenuItem>
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <MenuItem
              key={level}
              active={state?.heading === level}
              onClick={() => run(() => editor.chain().focus().toggleHeading({ level }).run())}
            >
              Заголовок {level}
            </MenuItem>
          ))}
        </Menu>
        <Menu
          label="Список"
          icon="list"
          active={Boolean(state?.bullet || state?.ordered || state?.task)}
          open={open === 'list'}
          onToggle={() => setOpen(open === 'list' ? null : 'list')}
        >
          <MenuItem active={state?.bullet} onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}>
            Маркированный
          </MenuItem>
          <MenuItem active={state?.ordered} onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}>
            Нумерованный
          </MenuItem>
          <MenuItem active={state?.task} onClick={() => run(() => editor.chain().focus().toggleTaskList().run())}>
            Чек-лист
          </MenuItem>
        </Menu>
        <ToolButton label="Цитата" active={state?.quote} disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Icon name="quote" />
        </ToolButton>
        <ToolButton label="Блок кода" active={state?.codeBlock} disabled={disabled} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Icon name="codeBlock" />
        </ToolButton>
      </div>

      <div className="toolbar-group">
        <ToolButton label="Жирный" shortcut="Ctrl+B" active={state?.bold} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Icon name="bold" />
        </ToolButton>
        <ToolButton label="Курсив" shortcut="Ctrl+I" active={state?.italic} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Icon name="italic" />
        </ToolButton>
        <ToolButton label="Зачёркнутый" active={state?.strike} disabled={disabled} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Icon name="strike" />
        </ToolButton>
        <ToolButton label="Код" shortcut="Ctrl+E" active={state?.code} disabled={disabled} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Icon name="code" />
        </ToolButton>
        <ToolButton label="Подчёркнутый" shortcut="Ctrl+U" active={state?.underline} disabled={disabled} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Icon name="underline" />
        </ToolButton>
        <ToolButton label="Маркер" shortcut="Ctrl+Shift+H" active={state?.highlight} disabled={disabled} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Icon name="highlight" />
        </ToolButton>
        <div className="menu-wrap">
          <ToolButton
            label="Ссылка"
            active={state?.link || open === 'link'}
            disabled={disabled}
            onClick={() => setOpen(open === 'link' ? null : 'link')}
          >
            <Icon name="link" />
          </ToolButton>
          {open === 'link' && editor ? (
            <div className="menu-pop link-pop">
              <LinkControls editor={editor} onDone={() => setOpen(null)} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="toolbar-group">
        <ToolButton label="Верхний индекс" shortcut="Ctrl+." active={state?.superscript} disabled={disabled} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
          <Icon name="superscript" />
        </ToolButton>
        <ToolButton label="Нижний индекс" shortcut="Ctrl+," active={state?.subscript} disabled={disabled} onClick={() => editor.chain().focus().toggleSubscript().run()}>
          <Icon name="subscript" />
        </ToolButton>
      </div>

      <div className="toolbar-group">
        <ToolButton label="По левому краю" shortcut="Ctrl+Shift+L" active={state?.align === 'left'} disabled={disabled} onClick={() => editor.chain().focus().toggleTextAlign('left').run()}>
          <Icon name="alignLeft" />
        </ToolButton>
        <ToolButton label="По центру" shortcut="Ctrl+Shift+E" active={state?.align === 'center'} disabled={disabled} onClick={() => editor.chain().focus().toggleTextAlign('center').run()}>
          <Icon name="alignCenter" />
        </ToolButton>
        <ToolButton label="По правому краю" shortcut="Ctrl+Shift+R" active={state?.align === 'right'} disabled={disabled} onClick={() => editor.chain().focus().toggleTextAlign('right').run()}>
          <Icon name="alignRight" />
        </ToolButton>
        <ToolButton label="По ширине" shortcut="Ctrl+Shift+J" active={state?.align === 'justify'} disabled={disabled} onClick={() => editor.chain().focus().toggleTextAlign('justify').run()}>
          <Icon name="alignJustify" />
        </ToolButton>
      </div>

      <div className="toolbar-group">
        <Menu
          label="Добавить"
          icon="plus"
          open={open === 'add'}
          onToggle={() => setOpen(open === 'add' ? null : 'add')}
        >
          <form
            className="link-form"
            onSubmit={(event) => {
              event.preventDefault()
              const src = imageUrl.trim()
              if (!src || !editor) return
              editor.chain().focus().setImage({ src }).run()
              setImageUrl('')
              setOpen(null)
            }}
          >
            <input
              aria-label="Адрес картинки"
              placeholder="Адрес картинки"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              onMouseDown={(event) => event.stopPropagation()}
            />
            <button type="submit">Вставить</button>
          </form>
          <MenuItem onClick={() => run(() => editor.chain().focus().setHorizontalRule().run())}>
            Горизонтальная линия
          </MenuItem>
          <MenuItem onClick={() => run(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>
            Таблица
          </MenuItem>
        </Menu>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        <ToolButton label="Поиск" shortcut="Ctrl+F" active={findOpen} disabled={disabled} onClick={onToggleFind}>
          <Icon name="search" />
        </ToolButton>
        <ToolButton label="Показать JSON" shortcut="Ctrl+Alt+J" active={jsonOpen} disabled={disabled} onClick={onToggleJson}>
          <Icon name="json" />
        </ToolButton>
        <ToolButton label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} onClick={onToggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </ToolButton>
      </div>
    </div>
  )
}

export { ToolButton, LinkControls }
