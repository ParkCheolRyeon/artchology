import type { DesktopAPI } from '../shared/model'
declare global {
  interface Window {
    api: DesktopAPI
  }
}
