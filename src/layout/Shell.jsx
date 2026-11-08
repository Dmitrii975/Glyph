import { useEffect, useState } from 'react'
import Toolbar from '../editor/Toolbar.jsx'
import FindBar from '../editor/FindBar.jsx'
import JsonPanel from '../editor/JsonPanel.jsx'
import EditorSurface from '../editor/EditorSurface.jsx'
import PreviewPane from '../editor/PreviewPane.jsx'
import Icon from '../editor/icons.jsx'
import { useWorkspace } from '../workspace/Workspace.jsx'
import Sidebar from './Sidebar.jsx'
import TabBar from './TabBar.jsx'
import ChatPanel from './ChatPanel.jsx'
import DragBar, { clamp } from './DragBar.jsx'
import useStoredNumber, { useStoredFlag } from './useStoredNumber.js'

export default function Shell() {
  const { editor, preview, closePreview, status, setStatus } = useWorkspace()
  const [sidebarOpen, setSidebarOpen] = useStoredFlag('sidebar-open', true)
  const [chatOpen, setChatOpen] = useStoredFlag('chat-open', false)
  const [sidebarWidth, setSidebarWidth] = useStoredNumber('sidebar-width', 260)
  const [contextHeight, setContextHeight] = useStoredNumber('context-height', 240)
  const [chatWidth, setChatWidth] = useStoredNumber('chat-width', 340)
  const [previewWidth, setPreviewWidth] = useStoredNumber('preview-width', 420)
  const [theme, setTheme] = useState(() => localStorage.getItem('editor-theme') || 'dark')
  const [findOpen, setFindOpen] = useState(false)
  const [jsonOpen, setJsonOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('editor-theme', theme)
  }, [theme])

  useEffect(() => {
    function onKey(event) {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'j') {
        event.preventDefault()
        setJsonOpen((open) => !open)
      }
      if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setFindOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="shell">
      {sidebarOpen ? (
        <Sidebar width={sidebarWidth} contextHeight={contextHeight} onContextHeight={setContextHeight} />
      ) : (
        <button type="button" className="edge-tab" onClick={() => setSidebarOpen(true)}>
          <Icon name="sidebar" />
          <span>Документы</span>
        </button>
      )}
      {sidebarOpen ? (
        <DragBar axis="x" label="Ширина списка" onDrag={(delta) => setSidebarWidth(clamp(sidebarWidth + delta, 200, 460))} />
      ) : null}
      <div className="workspace">
        <TabBar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        {status ? (
          <div className="status-line" role="status">
            <span>{status}</span>
            <button type="button" onClick={() => setStatus('')}>Закрыть</button>
          </div>
        ) : null}
        <Toolbar
          editor={editor}
          theme={theme}
          onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
          findOpen={findOpen}
          onToggleFind={() => {
            if (findOpen) editor?.commands.clearSearch()
            setFindOpen((open) => !open)
          }}
          jsonOpen={jsonOpen}
          onToggleJson={() => setJsonOpen((open) => !open)}
        />
        {findOpen && editor ? <FindBar editor={editor} onClose={() => setFindOpen(false)} /> : null}
        <div className="panes">
          <EditorSurface />
          {preview ? (
            <>
              <DragBar
                axis="x"
                label="Ширина просмотра"
                onDrag={(delta) => setPreviewWidth(clamp(previewWidth - delta, 240, 760))}
              />
              <div className="preview-slot" style={{ width: previewWidth }}>
                <PreviewPane key={preview.filePath} file={preview} onClose={closePreview} />
              </div>
            </>
          ) : null}
        </div>
      </div>
      {chatOpen ? (
        <DragBar axis="x" label="Ширина чата" onDrag={(delta) => setChatWidth(clamp(chatWidth - delta, 280, 560))} />
      ) : null}
      {chatOpen ? (
        <ChatPanel width={chatWidth} onClose={() => setChatOpen(false)} />
      ) : (
        <button type="button" className="edge-tab edge-chat" onClick={() => setChatOpen(true)}>
          <Icon name="chat" />
          <span>Ассистент</span>
        </button>
      )}
      {jsonOpen && editor ? <JsonPanel editor={editor} onClose={() => setJsonOpen(false)} /> : null}
    </div>
  )
}
