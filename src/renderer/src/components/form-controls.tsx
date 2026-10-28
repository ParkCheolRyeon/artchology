import {
  Children,
  isValidElement,
  useId,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ComponentProps
} from 'react'
import { CalendarDays } from 'lucide-react'
import { ko } from 'react-day-picker/locale'
import { cn } from '@renderer/lib/utils'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Calendar } from './ui/calendar'
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select'

const EMPTY = '__empty_selection__'
interface OptionProps {
  value?: string | number
  children?: ReactNode
  disabled?: boolean
}
export function FormSelect({
  children,
  value,
  defaultValue,
  onValueChange,
  className,
  ...props
}: {
  children: ReactNode
  value?: string | number
  defaultValue?: string | number
  onValueChange?: (value: string) => void
} & Omit<ComponentProps<'button'>, 'value' | 'defaultValue' | 'onChange' | 'children'> & {
    required?: boolean
    name?: string
  }): React.JSX.Element {
  const options = Children.toArray(children)
    .filter(isValidElement<OptionProps>)
    .map((child) => ({
      value: String(child.props.value ?? child.props.children ?? ''),
      label: child.props.children,
      disabled: child.props.disabled
    }))
  const [local, setLocal] = useState(String(defaultValue ?? options[0]?.value ?? ''))
  const selected = value === undefined ? local : String(value)
  const { required, name, disabled, ...triggerProps } = props
  return (
    <Select
      value={selected || EMPTY}
      onValueChange={(next) => {
        const v = next === EMPTY ? '' : next
        setLocal(v)
        onValueChange?.(v)
      }}
      required={required}
      name={name}
      disabled={disabled}
    >
      <SelectTrigger
        {...triggerProps}
        className={cn('h-10 w-full min-w-0 bg-white px-3 text-[13px] shadow-none', className)}
      >
        <SelectValue placeholder="선택하세요" />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={6}
        className="max-h-72 min-w-[var(--radix-select-trigger-width)] rounded-lg border bg-popover p-1 shadow-lg"
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value || EMPTY}
            disabled={option.disabled}
            className="min-h-9 rounded-md text-[13px]"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
export function FormCheckbox({
  onCheckedChange,
  className,
  ...props
}: Omit<ComponentProps<typeof Checkbox>, 'onCheckedChange'> & {
  onCheckedChange?: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <Checkbox
      {...props}
      className={cn('size-4 shrink-0 rounded border-input', className)}
      onCheckedChange={(v) => onCheckedChange?.(v === true)}
    />
  )
}
export function DateInput({
  value,
  defaultValue,
  onValueChange,
  type = 'date',
  className,
  disabled,
  readOnly,
  min,
  max,
  ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'defaultValue' | 'onChange' | 'type'> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  type?: string
}): React.JSX.Element {
  const [local, setLocal] = useState(defaultValue ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const current = value ?? local
  const parsed = new Date(`${current.slice(0, 10)}T12:00:00`)
  const selected = Number.isNaN(parsed.getTime()) ? undefined : parsed
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(selected ?? new Date())
  const id = useId(),
    withTime = type === 'datetime-local'
  useEffect(() => {
    if (!current) {
      inputRef.current?.setCustomValidity('')
      return
    }
    const date = new Date(`${current.slice(0, 10)}T12:00:00`)
    const dateText = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const validDate =
      /^\d{4}-\d{2}-\d{2}$/.test(current.slice(0, 10)) && dateText === current.slice(0, 10)
    const validTime = !withTime || /^([01]\d|2[0-3]):[0-5]\d$/.test(current.slice(11))
    const inRange = (!min || current >= String(min)) && (!max || current <= String(max))
    inputRef.current?.setCustomValidity(
      validDate && validTime && inRange ? '' : '올바른 날짜와 시간을 입력해 주세요.'
    )
  }, [current, withTime, min, max])
  function update(next: string): void {
    setLocal(next)
    onValueChange?.(next)
  }
  function choose(date: Date): void {
    const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    update(withTime ? `${dateValue}T${current.slice(11, 16) || '09:00'}` : dateValue)
    if (!withTime) setOpen(false)
  }
  const earliest = min ? new Date(`${String(min).slice(0, 10)}T00:00:00`) : undefined
  const latest = max ? new Date(`${String(max).slice(0, 10)}T23:59:59`) : undefined
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setMonth(selected ?? new Date())
      }}
    >
      <div className={cn('relative flex min-w-0 items-center', className)} data-date-field>
        <Input
          {...props}
          ref={inputRef}
          type="text"
          value={current}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(e) => update(e.target.value)}
          placeholder={withTime ? 'YYYY-MM-DDTHH:mm' : 'YYYY-MM-DD'}
          pattern={
            withTime ? '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' : '[0-9]{4}-[0-9]{2}-[0-9]{2}'
          }
          className="h-10 bg-white pr-10 text-[13px] tabular-nums shadow-none"
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled || readOnly}
            aria-label={`${props['aria-label'] || '날짜'} 달력 열기`}
            className="absolute right-1 text-muted-foreground"
          >
            <CalendarDays className="size-4" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-auto rounded-xl bg-white p-3 shadow-xl"
        aria-label="날짜 선택"
      >
        <div className="mb-3 flex items-center gap-2">
          <FormSelect
            aria-label="달력 연도"
            value={month.getFullYear()}
            onValueChange={(v) => setMonth(new Date(Number(v), month.getMonth(), 1))}
          >
            {Array.from({ length: 201 }, (_, i) => 1900 + i).map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </FormSelect>
          <FormSelect
            aria-label="달력 월"
            value={month.getMonth()}
            onValueChange={(v) => setMonth(new Date(month.getFullYear(), Number(v), 1))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {i + 1}월
              </option>
            ))}
          </FormSelect>
        </div>
        <Calendar
          mode="single"
          locale={ko}
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={(date) => {
            if (date) choose(date)
          }}
          disabled={(date) => !!((earliest && date < earliest) || (latest && date > latest))}
          className="rounded-lg bg-white p-0 [--cell-size:2.35rem]"
        />
        {withTime && (
          <div className="mt-3 flex items-center gap-3 border-t pt-3">
            <label htmlFor={id} className="text-sm text-muted-foreground">
              시간
            </label>
            <Input
              id={id}
              aria-label="일정 시간"
              type="text"
              inputMode="numeric"
              placeholder="09:00"
              pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
              maxLength={5}
              value={current.slice(11, 16)}
              onChange={(e) => update(`${current.slice(0, 10)}T${e.target.value}`)}
              className="h-9 w-24"
            />
          </div>
        )}
        <div className="mt-3 flex justify-between border-t pt-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => choose(new Date())}>
            오늘
          </Button>
          <div className="flex gap-1">
            {!props.required && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  update('')
                  setOpen(false)
                }}
              >
                지우기
              </Button>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              완료
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
