import {
  cloneElement,
  isValidElement,
  useId,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode
} from 'react'
import { X, ArrowUpRight, Search, Sprout } from 'lucide-react'
import type { Student } from '../../../shared/model'

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}): React.JSX.Element {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}
export function Avatar({
  student,
  large = false
}: {
  student: Student
  large?: boolean
}): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`avatar avatar-${student.grade % 4} ${large ? 'avatar-large' : ''}`}
    >
      {student.name.slice(-2)}
    </span>
  )
}
export function Badge({
  children,
  tone = 'green'
}: {
  children: ReactNode
  tone?: 'green' | 'amber' | 'gray' | 'blue'
}): React.JSX.Element {
  return (
    <span className={`badge badge-${tone}`}>
      <span />
      {children}
    </span>
  )
}
export function Empty({
  title,
  description,
  action
}: {
  title: string
  description?: string
  action?: ReactNode
}): React.JSX.Element {
  return (
    <div className="empty">
      <Sprout size={30} strokeWidth={1.4} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
export function SearchInput({
  value,
  onChange,
  placeholder = '학생 이름 검색'
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}): React.JSX.Element {
  return (
    <div className="search-input">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button aria-label="검색 지우기" onClick={() => onChange('')}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}
export function PageHeading({
  title,
  subtitle,
  children
}: {
  title: string
  subtitle: string
  children?: ReactNode
}): React.JSX.Element {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  )
}
export function SectionHeading({
  title,
  count,
  onClick,
  action = '전체 보기'
}: {
  title: string
  count?: number
  onClick?: () => void
  action?: string
}): React.JSX.Element {
  return (
    <div className="section-heading">
      <h2>
        {title}
        {count !== undefined && <span>{count}</span>}
      </h2>
      {onClick && (
        <button className="text-link" onClick={onClick}>
          {action}
          <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  )
}
export function Field({
  label,
  children,
  full = false
}: {
  label: string
  children: ReactNode
  full?: boolean
}): React.JSX.Element {
  const labelId = useId()
  return (
    <label className={`field ${full ? 'field-full' : ''}`}>
      <span id={labelId}>{label}</span>
      {isValidElement<{ 'aria-labelledby'?: string }>(children)
        ? cloneElement(children, { 'aria-labelledby': labelId })
        : children}
    </label>
  )
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  busy = false
}: {
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
}): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <div className="modal-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button disabled={busy} className="icon-button" aria-label="닫기" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
