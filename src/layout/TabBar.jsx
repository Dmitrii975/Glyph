import Icon from '../editor/icons.jsx'
import { useWorkspace } from '../workspace/Workspace.jsx'

export default function TabBar({ sidebarOpen, onToggleSidebar }) {
  const { documents, activeId, selectDocument, closeDocument, agentRunning } = useWorkspace()
  return (
    <div className="tabbar">
      <button
        type="button"
        className="icon-button"
        aria-label={sidebarOpen ? 'Скрыть документы' : 'Показать документы'}
        aria-pressed={sidebarOpen}
        onClick={onToggleSidebar}
      >
        <Icon name="sidebar" />
      </button>
      <div className="tabs" role="tablist">
        {documents.map((doc) => (
          <div key={doc.id} className={doc.id === activeId ? 'tab is-active' : 'tab'} role="tab" aria-selected={doc.id === activeId}>
            <button type="button" className="tab-name" onClick={() => selectDocument(doc.id)}>
              {doc.dirty ? <span className="dirty-dot" aria-hidden="true" /> : null}
              {doc.name}
            </button>
            <button
              type="button"
              className="icon-button tiny"
              aria-label={`Закрыть ${doc.name}`}
              onClick={() => closeDocument(doc.id)}
            >
              <Icon name="close" />
            </button>
          </div>
        ))}
      </div>
      {agentRunning ? <span className="agent-state">Ассистент правит документ</span> : null}
    </div>
  )
}
