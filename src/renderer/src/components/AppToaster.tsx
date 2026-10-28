import { Toast } from 'radix-ui'
import { CircleCheck, CircleAlert, TriangleAlert, Info, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast, useToastStore } from '../lib/toast'

const variants = {
  success: { icon: CircleCheck, label: '완료', color: 'border-emerald-200 text-emerald-700' },
  info: { icon: Info, label: '안내', color: 'border-blue-200 text-blue-700' },
  warn: { icon: TriangleAlert, label: '확인 필요', color: 'border-amber-200 text-amber-700' },
  error: { icon: CircleAlert, label: '오류', color: 'border-red-200 text-red-700' }
}

export function AppToaster({ children }: { children: ReactNode }): React.JSX.Element {
  const messages = useToastStore((state) => state.messages)
  return (
    <>
      {children}
      {messages.length > 0 && (
        <Toast.Provider swipeDirection="right" label="알림">
          {messages.map((item) => {
            const variant = variants[item.tone]
            const Icon = variant.icon
            return (
              <Toast.Root
                key={item.id}
                open
                duration={item.duration}
                onOpenChange={(open) => {
                  if (!open) toast.dismiss(item.id)
                }}
                data-testid="toast"
                data-tone={item.tone}
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:slide-in-from-bottom-2 ${variant.color}`}
              >
                <Icon size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Toast.Title className="text-xs font-semibold">{variant.label}</Toast.Title>
                  <Toast.Description className="mt-1 break-words text-sm leading-6 text-slate-700">
                    {item.message}
                  </Toast.Description>
                </div>
                <Toast.Close
                  aria-label="알림 닫기"
                  className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500"
                >
                  <X size={16} />
                </Toast.Close>
              </Toast.Root>
            )
          })}
          <Toast.Viewport
            label="알림 목록 (F8)"
            className="pointer-events-none fixed right-5 bottom-5 z-[200] m-0 flex w-[min(400px,calc(100vw-40px))] list-none flex-col gap-3 outline-none"
          />
        </Toast.Provider>
      )}
    </>
  )
}
