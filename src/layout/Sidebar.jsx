import Icon from '../editor/icons.jsx'
import DragBar, { clamp } from './DragBar.jsx'
import { useWorkspace } from '../workspace/Workspace.jsx'

function DocumentList() {
  const { documents, activeId, selectDocument, closeDocument } = useWorkspace()
  return (
    <div className="side-block">
      <div className="side-head">
        <h2>Документы</h2>
        <span>{documents.length}</span>
      </div>
      <ul className="doc-list">
        {documents.map((doc) => (
          <li key={doc.id}>
            <button
              type="button"
              className={doc.id === activeId ? 'doc-row is-active' : 'doc-row'}
              onClick={() => selectDocument(doc.id)}
            >
              {doc.dirty ? <span className="dirty-dot" aria-hidden="true" /> : <span className="dirty-gap" aria-hidden="true" />}
              <span className="doc-name">{doc.name}</span>
            </button>
            <button
              type="button"
              className="icon-button tiny"
              aria-label={`Закрыть ${doc.name}`}
              onClick={() => closeDocument(doc.id)}
            >
              <Icon name="close" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContextList() {
  const {
    contextFiles,
    preview,
    addContextFiles,
    toggleContext,
    removeContext,
    openPreview,
  } = useWorkspace()
  const checked = contextFiles.filter((file) => file.checked).length
  return (
    <div className="side-block">
      <div className="side-head">
        <h2>Контекст</h2>
        <span>{contextFiles.length ? `${checked} из ${contextFiles.length}` : ''}</span>
      </div>
      <ul className="doc-list context-list">
        {contextFiles.map((file) => (
          <li key={file.id} className={preview?.filePath === file.filePath ? 'is-open' : undefined}>
            <label className="check">
              <input
                type="checkbox"
                checked={file.checked}
                onChange={() => toggleContext(file.id)}
                aria-label={`Учитывать ${file.name}`}
              />
            </label>
            <button type="button" className="doc-row" onClick={() => openPreview(file)}>
              <span className="doc-name">{file.name}</span>
            </button>
            <button
              type="button"
              className="icon-button tiny"
              aria-label={`Убрать ${file.name}`}
              onClick={() => removeContext(file.id)}
            >
              <Icon name="close" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="text-button" onClick={addContextFiles}>Добавить файлы</button>
    </div>
  )
}

export default function Sidebar({ width, contextHeight, onContextHeight }) {
  return (
    <aside className="sidebar" style={{ width }} aria-label="Документы и контекст">
      <DocumentList />
      <DragBar
        axis="y"
        label="Высота контекста"
        onDrag={(delta) => onContextHeight(clamp(contextHeight - delta, 140, 520))}
      />
      <div className="sidebar-context" style={{ height: contextHeight }}>
        <ContextList />
      </div>
    </aside>
  )
}
