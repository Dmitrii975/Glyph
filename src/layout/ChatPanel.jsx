import { useEffect, useRef, useState } from 'react'
import Icon from '../editor/icons.jsx'
import { runAgent } from '../ai/agent.js'
import { toolLabel } from '../ai/tools.js'
import { useWorkspace } from '../workspace/Workspace.jsx'

function nextId() {
  return crypto.randomUUID()
}

function visibleHistory(messages) {
  return messages
    .filter((item) => (item.role === 'user' || item.role === 'assistant') && item.text?.trim() && !item.live)
    .slice(-12)
    .map((item) => ({ role: item.role, content: item.text }))
}

function ToolStep({ message }) {
  const [open, setOpen] = useState(false)
  const failed = message.result?.ok === false
  const label = message.result?.summary || message.result?.error || toolLabel(message.name)
  return (
    <div className={failed ? 'tool-step is-error' : 'tool-step'}>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        <span className="tool-mark" aria-hidden="true" />
        {label}
      </button>
      {open ? (
        <pre>{JSON.stringify({ name: message.name, arguments: message.args, result: message.result }, null, 2)}</pre>
      ) : null}
    </div>
  )
}

export default function ChatPanel({ width, onClose }) {
  const {
    editor,
    contextFiles,
    openPreview,
    readCheckedContext,
    setAgentRunning,
    agentRunning,
  } = useWorkspace()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [config, setConfig] = useState(null)
  const abortRef = useRef(null)
  const runningRef = useRef(false)
  const endRef = useRef(null)
  const checked = contextFiles.filter((file) => file.checked)

  useEffect(() => {
    let gone = false
    window.ai?.config().then((value) => {
      if (!gone) setConfig(value)
    }).catch(() => {})
    return () => {
      gone = true
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, agentRunning])

  function onEvent(event) {
    if (event.type === 'text') {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.live) {
          return prev.map((item, index) => (
            index === prev.length - 1 ? { ...item, text: item.text + event.chunk } : item
          ))
        }
        return [...prev, { id: nextId(), role: 'assistant', text: event.chunk, live: true }]
      })
      return
    }
    if (event.type === 'tool-start') {
      setMessages((prev) => [
        ...prev.map((item) => (item.live ? { ...item, live: false } : item)),
        { id: event.id || nextId(), role: 'tool', name: event.name, args: event.args, result: null },
      ])
      return
    }
    if (event.type === 'tool') {
      setMessages((prev) => {
        const index = prev.findIndex((item) => item.role === 'tool' && item.id === event.id)
        if (index === -1) {
          return [...prev, {
            id: event.id || nextId(),
            role: 'tool',
            name: event.name,
            args: event.args,
            result: event.result,
          }]
        }
        return prev.map((item, itemIndex) => (
          itemIndex === index ? { ...item, args: event.args, result: event.result } : item
        ))
      })
      return
    }
    if (event.type === 'break') {
      setMessages((prev) => prev.map((item) => (item.live ? { ...item, live: false } : item)))
      return
    }
    if (event.type === 'notice') {
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: event.text }])
    }
  }

  async function send() {
    const text = draft.trim()
    if (!text || runningRef.current || !editor) return
    const history = visibleHistory(messages)
    setDraft('')
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }])
    runningRef.current = true
    setAgentRunning(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const files = await readCheckedContext()
      if (controller.signal.aborted) throw new DOMException('Остановлено', 'AbortError')
      await runAgent({
        editor,
        task: text,
        history,
        contextFiles: files,
        onEvent,
        signal: controller.signal,
      })
    } catch (error) {
      const message = error?.name === 'AbortError' ? 'Остановлено.' : (error.message || 'Не удалось получить ответ')
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: message }])
    } finally {
      setMessages((prev) => prev.map((item) => (item.live ? { ...item, live: false } : item)))
      runningRef.current = false
      setAgentRunning(false)
      abortRef.current = null
    }
  }

  function stop() {
    abortRef.current?.abort()
  }

  return (
    <aside className="chat" style={{ width }} aria-label="Ассистент">
      <header className="chat-head">
        <h2>Ассистент</h2>
        <button type="button" className="icon-button" aria-label="Закрыть чат" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      {checked.length ? (
        <div className="chips">
          <span>В контексте</span>
          {checked.map((file) => (
            <button key={file.id} type="button" className="chip" onClick={() => openPreview(file)}>
              {file.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="chat-log">
        {messages.length ? null : (
          <p className="chat-empty">Напишите, что изменить в документе. Ассистент правит отдельные блоки, а не переписывает файл целиком.</p>
        )}
        {messages.map((message) => {
          if (message.role === 'tool') return <ToolStep key={message.id} message={message} />
          return (
            <p key={message.id} className={message.role === 'user' ? 'bubble user' : 'bubble assistant'}>
              {message.text}
            </p>
          )
        })}
        <div ref={endRef} />
      </div>
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <textarea
          rows={3}
          value={draft}
          disabled={agentRunning}
          placeholder={editor ? 'Что нужно сделать с документом?' : 'Подождите, редактор открывается'}
          aria-label="Сообщение ассистенту"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              send()
            }
          }}
        />
        <div className="composer-bar">
          <span>{config?.model || 'Модель из .env'}</span>
          {agentRunning ? (
            <button type="button" className="send-button is-stop" onClick={stop}>Стоп</button>
          ) : (
            <button type="submit" className="send-button" disabled={!draft.trim() || !editor} aria-label="Отправить">
              ↑
            </button>
          )}
        </div>
      </form>
    </aside>
  )
}
