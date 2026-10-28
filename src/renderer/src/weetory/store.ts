import { create } from 'zustand'
import type { SetStateAction } from 'react'
import { createDemo, type WorkspaceData } from './model'
import { useAuthStore } from './auth'

function initialData(): WorkspaceData {
  const data = createDemo()
  const profile = useAuthStore.getState().device?.profile
  if (profile) {
    data.settings.affiliation = profile.affiliation
    data.settings.defaultClassification = profile.classification
    data.settings.counselor = profile.counselor || data.settings.counselor
    data.schools[0] = {
      ...data.schools[0],
      name: profile.school || data.schools[0].name,
      type: profile.schoolType,
      weeClass: profile.weeClass
    }
  }
  return data
}

// Session-only prototype state: navigation retains data; reload starts a new demo.
export const useWorkspaceStore = create<{
  data: WorkspaceData
  setData: (update: SetStateAction<WorkspaceData>) => void
}>((set) => ({
  data: initialData(),
  setData: (update) =>
    set(({ data }) => ({ data: typeof update === 'function' ? update(data) : update }))
}))
