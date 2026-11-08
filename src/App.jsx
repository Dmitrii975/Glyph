import { WorkspaceProvider } from './workspace/Workspace.jsx'
import Shell from './layout/Shell.jsx'

export default function App() {
  return (
    <WorkspaceProvider>
      <Shell />
    </WorkspaceProvider>
  )
}
