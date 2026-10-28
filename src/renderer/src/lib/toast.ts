import { create } from 'zustand'

export type ToastTone = 'warn' | 'success' | 'error' | 'info'
interface ToastOptions {
  duration?: number
}
interface ToastMessage {
  id: string
  message: string
  tone: ToastTone
  duration: number
}
const durations: Record<ToastTone, number> = { success: 4000, info: 5000, warn: 6000, error: 8000 }
export const useToastStore = create<{ messages: ToastMessage[] }>(() => ({ messages: [] }))
function show(tone: ToastTone, message: string, options: ToastOptions = {}): string {
  const id = crypto.randomUUID()
  if (!message.trim()) return id
  useToastStore.setState(({ messages }) => ({
    messages: [
      ...messages.filter((item) => item.message !== message || item.tone !== tone),
      { id, message, tone, duration: options.duration ?? durations[tone] }
    ].slice(-3)
  }))
  return id
}
export const toast = {
  warn: (message: string, options?: ToastOptions) => show('warn', message, options),
  success: (message: string, options?: ToastOptions) => show('success', message, options),
  error: (message: string, options?: ToastOptions) => show('error', message, options),
  info: (message: string, options?: ToastOptions) => show('info', message, options),
  dismiss: (id?: string): void => {
    useToastStore.setState(({ messages }) => ({
      messages: id ? messages.filter((item) => item.id !== id) : []
    }))
  }
}
