import { BrandIcon } from './BrandIcon'
import { Button as ShadcnButton } from './ui/button'
import { Badge as ShadcnBadge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { cn } from '../lib/utils'
import {
  cloneElement,
  isValidElement,
  useId,
  type ButtonHTMLAttributes,
  type ReactNode
} from 'react'
import { X, ArrowUpRight, Search } from 'lucide-react'
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
    <ShadcnButton
      variant={variant === 'primary' ? 'secondary' : variant === 'secondary' ? 'outline' : 'ghost'}
      className={cn('h-10 rounded-lg px-4 text-[13px] font-medium shadow-none', className)}
      {...props}
    >
      {children}
    </ShadcnButton>
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
    <ShadcnBadge
      variant="secondary"
      className={cn('gap-1.5 rounded-md border-0 px-2 py-1 text-[11px] font-medium', {
        'bg-emerald-50 text-emerald-700': tone === 'green',
        'bg-amber-50 text-amber-700': tone === 'amber',
        'bg-slate-100 text-slate-500': tone === 'gray',
        'bg-blue-50 text-blue-600': tone === 'blue'
      })}
    >
      <span className="size-1 rounded-full bg-current opacity-60" />
      {children}
    </ShadcnBadge>
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
      <BrandIcon size={30} />
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
  const descriptionId = useId()
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent
        className="max-h-[88vh] gap-6 overflow-y-auto bg-white p-6 sm:max-w-[680px]"
        showCloseButton={!busy}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault()
        }}
        aria-describedby={subtitle ? descriptionId : undefined}
      >
        <DialogHeader className="mb-2 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
          {subtitle && (
            <DialogDescription id={descriptionId} className="text-[13px] leading-relaxed">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
