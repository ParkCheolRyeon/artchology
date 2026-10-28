import { Tabs as RadixTabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card } from '../components/ui/card'
import { cn } from '../lib/utils'
import type { ComponentProps } from 'react'
export function Surface({ className, ...props }: ComponentProps<typeof Card>): React.JSX.Element {
  return <Card className={cn('block gap-0 p-6 shadow-none', className)} {...props} />
}
import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
export { Button, Field, Modal, Empty, PageHeading, SectionHeading, Badge } from '../components/ui'
export function Tabs({
  items,
  value,
  onChange,
  label = '하위 메뉴'
}: {
  items: readonly string[]
  value: string
  onChange: (value: string) => void
  label?: string
}): React.JSX.Element {
  return (
    <RadixTabs value={value} onValueChange={onChange} className="mb-6 min-w-0">
      <TabsList
        aria-label={label}
        className="h-auto group-data-[orientation=horizontal]/tabs:h-auto max-w-full justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-none border-b bg-transparent p-0 pb-2"
      >
        {items.map((item) => (
          <TabsTrigger
            key={item}
            value={item}
            className="h-10 shrink-0 rounded-lg px-4 text-[13px] text-muted-foreground shadow-none data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
          >
            {item}
          </TabsTrigger>
        ))}
      </TabsList>
    </RadixTabs>
  )
}
export function Back({
  onClick,
  children = '목록으로'
}: {
  onClick: () => void
  children?: ReactNode
}): React.JSX.Element {
  return (
    <button className="back-link" onClick={onClick}>
      <ArrowLeft size={15} />
      {children}
    </button>
  )
}
export function RowLink({
  children,
  onClick
}: {
  children: ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <button className="wt-row-link" onClick={onClick}>
      {children}
      <ChevronRight size={16} />
    </button>
  )
}
export function DemoNotice(): React.JSX.Element {
  return <p className="wt-note">화면 PoC · 변경 내용은 앱을 종료하면 초기화됩니다.</p>
}
export function Preview({
  title,
  children
}: {
  title: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="surface wt-preview">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
