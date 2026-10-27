import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction
} from 'react'
import { createDemo, type WorkspaceData } from './model'
export interface WorkspaceContext {
  data: WorkspaceData
  setData: Dispatch<SetStateAction<WorkspaceData>>
  path: string
  navigate: (path: string) => void
  notify: (message: string) => void
}
const Context = createContext<WorkspaceContext | null>(null)
export function WorkspaceProvider({
  children,
  path,
  navigate,
  notify
}: {
  children: ReactNode
  path: string
  navigate: (path: string) => void
  notify: (message: string) => void
}): React.JSX.Element {
  const [data, setData] = useState(createDemo)
  return (
    <Context.Provider value={{ data, setData, path, navigate, notify }}>
      {children}
    </Context.Provider>
  )
}
// Provider and hook are intentionally colocated for this UI-only workspace.
// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace(): WorkspaceContext {
  const context = useContext(Context)
  if (!context) throw new Error('WorkspaceProvider가 필요합니다.')
  return context
}
