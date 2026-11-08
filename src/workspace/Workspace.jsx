import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { initialMarkdown } from '../editor/extensions.js'

const WorkspaceContext = createContext(null)

function untitledName(docs) {
  const names = new Set(docs.map((doc) => doc.name))
  if (!names.has('Без названия')) return 'Без названия'
  let index = 2
  while (names.has(`Без названия ${index}`)) index += 1
  return `Без названия ${index}`
}

function baseName(filePath) {
  const parts = String(filePath).split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}

function blankDocument(docs, markdown = '') {
  return {
    id: crypto.randomUUID(),
    filePath: null,
    name: untitledName(docs),
    markdown,
    snapshot: null,
    dirty: false,
  }
}

export function WorkspaceProvider({ children }) {
  const first = useRef(null)
  if (!first.current) {
    first.current = {
      id: crypto.randomUUID(),
      filePath: null,
      name: 'Без названия',
      markdown: initialMarkdown,
      snapshot: null,
      dirty: false,
    }
  }
  const [documents, setDocuments] = useState(() => [first.current])
  const [activeId, setActiveId] = useState(first.current.id)
  const [contextFiles, setContextFiles] = useState([])
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState('')
  const [editor, setEditor] = useState(null)
  const [agentRunning, setAgentRunningState] = useState(false)
  const agentRunningRef = useRef(false)
  const docsRef = useRef(documents)
  const activeIdRef = useRef(activeId)
  const contextRef = useRef(contextFiles)
  const editorRef = useRef(null)
  const ignoreRef = useRef(true)
  const actionsRef = useRef({})
  docsRef.current = documents
  activeIdRef.current = activeId
  contextRef.current = contextFiles

  const registerEditor = useCallback((instance) => {
    editorRef.current = instance
    setEditor((current) => (current === instance ? current : instance))
  }, [])

  const getDocument = useCallback((id) => docsRef.current.find((doc) => doc.id === id) || null, [])

  const setAgentRunning = useCallback((value) => {
    agentRunningRef.current = value
    setAgentRunningState(value)
  }, [])

  function agentBusy() {
    if (!agentRunningRef.current) return false
    setStatus('Дождитесь, пока ассистент закончит правку')
    return true
  }

  const markDirty = useCallback((id) => {
    if (!id || ignoreRef.current) return
    setDocuments((docs) => docs.map((doc) => (doc.id === id && !doc.dirty ? { ...doc, dirty: true } : doc)))
  }, [])

  function stashActive() {
    const current = editorRef.current
    const id = activeIdRef.current
    if (!current || current.isDestroyed || !id) return
    const snapshot = current.getJSON()
    setDocuments((docs) => docs.map((doc) => (doc.id === id ? { ...doc, snapshot } : doc)))
  }

  function selectDocument(id) {
    if (!id || id === activeIdRef.current) return
    if (agentBusy()) return
    stashActive()
    setActiveId(id)
    setStatus('')
  }

  function markdownOf(doc) {
    const current = editorRef.current
    if (doc.id === activeIdRef.current && current && !current.isDestroyed) return current.getMarkdown()
    if (doc.snapshot && current?.markdown) return current.markdown.serialize(doc.snapshot)
    return doc.markdown || ''
  }

  async function saveDocument(id) {
    const doc = docsRef.current.find((item) => item.id === id)
    if (!doc) return false
    if (!window.files) {
      setStatus('Сохранение доступно в окне приложения')
      return false
    }
    try {
      const content = markdownOf(doc)
      if (doc.filePath) {
        await window.files.save({ filePath: doc.filePath, content })
        setDocuments((docs) => docs.map((item) => (
          item.id === id ? { ...item, dirty: false, markdown: content } : item
        )))
      } else {
        const result = await window.files.saveAs({ content })
        if (!result || result.canceled) return false
        setDocuments((docs) => docs.map((item) => (
          item.id === id
            ? { ...item, dirty: false, markdown: content, filePath: result.filePath, name: baseName(result.filePath) }
            : item
        )))
      }
      setStatus('')
      return true
    } catch (error) {
      setStatus(error.message)
      return false
    }
  }

  function newDocument() {
    if (agentBusy()) return
    stashActive()
    const doc = blankDocument(docsRef.current)
    setDocuments((docs) => [...docs, doc])
    setActiveId(doc.id)
    setStatus('')
  }

  async function openFile() {
    if (agentBusy()) return
    if (!window.files) {
      setStatus('Открытие доступно в окне приложения')
      return
    }
    try {
      const result = await window.files.open()
      if (!result || result.canceled) return
      const existing = docsRef.current.find((doc) => doc.filePath === result.filePath)
      if (existing) {
        selectDocument(existing.id)
        return
      }
      const doc = {
        id: crypto.randomUUID(),
        filePath: result.filePath,
        name: baseName(result.filePath),
        markdown: result.content,
        snapshot: null,
        dirty: false,
      }
      stashActive()
      setDocuments((docs) => [...docs, doc])
      setActiveId(doc.id)
      setStatus('')
    } catch (error) {
      setStatus(error.message)
    }
  }

  function save() {
    if (activeIdRef.current) return saveDocument(activeIdRef.current)
    return false
  }

  function saveAs() {
    const id = activeIdRef.current
    const doc = docsRef.current.find((item) => item.id === id)
    if (!doc) return false
    if (!window.files) {
      setStatus('Сохранение доступно в окне приложения')
      return false
    }
    return (async () => {
      try {
        const content = markdownOf(doc)
        const result = await window.files.saveAs({ content })
        if (!result || result.canceled) return false
        setDocuments((docs) => docs.map((item) => (
          item.id === id
            ? { ...item, dirty: false, markdown: content, filePath: result.filePath, name: baseName(result.filePath) }
            : item
        )))
        setStatus('')
        return true
      } catch (error) {
        setStatus(error.message)
        return false
      }
    })()
  }

  function removeDocument(id) {
    const remaining = docsRef.current.filter((doc) => doc.id !== id)
    if (!remaining.length) {
      const fresh = blankDocument([])
      setDocuments([fresh])
      setActiveId(fresh.id)
      return
    }
    if (activeIdRef.current === id) {
      const index = docsRef.current.findIndex((doc) => doc.id === id)
      setActiveId(remaining[Math.min(index, remaining.length - 1)].id)
    }
    setDocuments(remaining)
  }

  async function closeDocument(id) {
    if (agentBusy()) return
    const doc = docsRef.current.find((item) => item.id === id)
    if (!doc) return
    if (doc.dirty && window.files) {
      const choice = await window.files.askSave({ name: doc.name })
      if (choice === 2 || choice == null) return
      if (choice === 0) {
        const saved = await saveDocument(id)
        if (!saved) return
      }
    }
    removeDocument(id)
  }

  async function confirmAll() {
    const dirty = docsRef.current.filter((doc) => doc.dirty)
    for (const doc of dirty) {
      if (!window.files) return true
      const choice = await window.files.askSave({ name: doc.name })
      if (choice === 2 || choice == null) return false
      if (choice === 0) {
        const saved = await saveDocument(doc.id)
        if (!saved) return false
      }
    }
    return true
  }

  async function handleClose() {
    if (agentRunningRef.current) {
      setStatus('Дождитесь, пока ассистент закончит правку')
      window.files?.confirmClose(false)
      return
    }
    const ok = await confirmAll()
    window.files?.confirmClose(ok)
  }

  async function addContextFiles() {
    if (!window.files) {
      setStatus('Добавление файлов доступно в окне приложения')
      return
    }
    try {
      const result = await window.files.openContext()
      if (!result || result.canceled) return
      setContextFiles((files) => {
        const known = new Set(files.map((file) => file.filePath))
        const added = result.files
          .filter((file) => file.filePath && !known.has(file.filePath))
          .map((file) => ({
            id: crypto.randomUUID(),
            filePath: file.filePath,
            name: file.name || baseName(file.filePath),
            bytes: file.bytes || 0,
            checked: true,
          }))
        return added.length ? [...files, ...added] : files
      })
      setStatus('')
    } catch (error) {
      setStatus(error.message)
    }
  }

  function toggleContext(id) {
    setContextFiles((files) => files.map((file) => (
      file.id === id ? { ...file, checked: !file.checked } : file
    )))
  }

  function removeContext(id) {
    const file = contextRef.current.find((item) => item.id === id)
    setContextFiles((files) => files.filter((item) => item.id !== id))
    if (file) {
      setPreview((current) => (current?.filePath === file.filePath ? null : current))
    }
  }

  async function openPreview(file) {
    if (!window.files) {
      setStatus('Просмотр доступен в окне приложения')
      return
    }
    try {
      const result = await window.files.readText(file.filePath)
      setPreview({ filePath: file.filePath, name: file.name, content: result.content })
      setStatus('')
    } catch (error) {
      setStatus(error.message)
    }
  }

  function closePreview() {
    setPreview(null)
  }

  async function readCheckedContext() {
    if (!window.files) return []
    const selected = contextRef.current.filter((file) => file.checked)
    const loaded = []
    for (const file of selected) {
      try {
        const result = await window.files.readText(file.filePath)
        loaded.push({ name: file.name, content: result.content })
      } catch (error) {
        loaded.push({ name: file.name, content: `[Не удалось прочитать файл: ${error.message}]` })
      }
    }
    return loaded
  }

  actionsRef.current = {
    newDocument,
    openFile,
    save,
    saveAs,
    closeActive: () => { if (activeIdRef.current) closeDocument(activeIdRef.current) },
    undo: () => editorRef.current?.chain().focus().undo().run(),
    redo: () => editorRef.current?.chain().focus().redo().run(),
    handleClose,
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      ignoreRef.current = false
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const doc = documents.find((item) => item.id === activeId)
    const name = doc?.name || 'Без названия'
    document.title = `${doc?.dirty ? '• ' : ''}${name} — New Vision`
  }, [documents, activeId])

  useEffect(() => {
    if (!window.files) return undefined
    window.files.ready()
    const stops = [
      window.files.on('menu:new', () => { actionsRef.current.newDocument() }),
      window.files.on('menu:open', () => { actionsRef.current.openFile() }),
      window.files.on('menu:save', () => { actionsRef.current.save() }),
      window.files.on('menu:save-as', () => { actionsRef.current.saveAs() }),
      window.files.on('menu:close', () => { actionsRef.current.closeActive() }),
      window.files.on('menu:undo', () => { actionsRef.current.undo() }),
      window.files.on('menu:redo', () => { actionsRef.current.redo() }),
      window.files.on('app:close-requested', () => { actionsRef.current.handleClose() }),
    ]
    return () => stops.forEach((stop) => stop())
  }, [])

  const activeDocument = documents.find((doc) => doc.id === activeId) || documents[0]

  return (
    <WorkspaceContext.Provider value={{
      documents,
      activeId,
      activeDocument,
      contextFiles,
      preview,
      status,
      setStatus,
      editor,
      agentRunning,
      setAgentRunning,
      ignoreRef,
      activeIdRef,
      registerEditor,
      getDocument,
      markDirty,
      selectDocument,
      newDocument,
      openFile,
      save,
      saveAs,
      closeDocument,
      addContextFiles,
      toggleContext,
      removeContext,
      openPreview,
      closePreview,
      readCheckedContext,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('WorkspaceProvider отсутствует')
  return value
}
