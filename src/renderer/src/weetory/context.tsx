import { toast, type ToastTone } from '../lib/toast'
import {
  createContext,
  useContext,
  type ReactNode,
  type Dispatch,
  type SetStateAction
} from 'react'
import { type WorkspaceData } from './model'
import { useWorkspaceStore } from './store'
export interface WorkspaceContext {
  data: WorkspaceData
  setData: Dispatch<SetStateAction<WorkspaceData>>
  path: string
  navigate: (path: string) => void
  notify: (message: string, tone?: ToastTone) => void
}
const Context = createContext<WorkspaceContext | null>(null)
export function WorkspaceProvider({
  children,
  path,
  navigate
}: {
  children: ReactNode
  path: string
  navigate: (path: string) => void
}): React.JSX.Element {
  const data = useWorkspaceStore((state) => state.data)
  const setData = useWorkspaceStore((state) => state.setData)
  const notify = (message: string, tone: ToastTone = 'info'): void => {
    toast[tone](message)
  }
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
