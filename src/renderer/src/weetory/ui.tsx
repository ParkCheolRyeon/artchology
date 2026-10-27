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
    <nav className="wt-tabs" aria-label={label}>
      {items.map((item) => (
        <button
          key={item}
          className={value === item ? 'active' : ''}
          aria-current={value === item ? 'page' : undefined}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </nav>
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
