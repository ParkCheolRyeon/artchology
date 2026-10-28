import { toast } from '../lib/toast'
import { useState } from 'react'
import { Plus, RotateCcw, Save, X } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Button, Empty, Surface } from './ui'
import { useWorkspace } from './context'
import type { Preferences } from './model'

type Period = Preferences['timetable'][number]
const minutes = (value: string): number => Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
const format = (value: number): string =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
const validTime = (value: string): boolean => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)

function defaultSchoolTimetable(type: string): Period[] {
  const duration = type === '초등학교' ? 40 : type === '중학교' ? 45 : 50
  const count = type === '초등학교' ? 6 : 7
  const rows: Period[] = []
  let cursor = 9 * 60
  for (let i = 1; i <= count; i++) {
    rows.push({ name: `${i}교시`, start: format(cursor), end: format(cursor + duration) })
    cursor += duration
    if (i === 4) {
      rows.push({ name: '점심', start: format(cursor), end: format(cursor + 50) })
      cursor += 50
    } else cursor += 10
  }
  return rows
}

function parseTime(value: string): string | null {
  const raw = value.trim().replace(/\s/g, '')
  const match = /^(오전|오후)?(\d{1,4})(?::(\d{1,2}))?$/.exec(raw)
  if (!match) return null
  let hour: number
  let minute: number
  if (match[3] !== undefined) {
    hour = Number(match[2])
    minute = Number(match[3])
  } else if (match[2].length > 2) {
    hour = Number(match[2].slice(0, -2))
    minute = Number(match[2].slice(-2))
  } else {
    hour = Number(match[2])
    minute = 0
  }
  if (match[1]) {
    if (hour < 1 || hour > 12) return null
    hour = (hour % 12) + (match[1] === '오후' ? 12 : 0)
  }
  if (hour > 23 || minute > 59) return null
  return format(hour * 60 + minute)
}

function EditableCell({
  value,
  label,
  duration = false,
  onCommit
}: {
  value: string
  label: string
  duration?: boolean
  onCommit: (value: string) => boolean
}): React.JSX.Element {
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  function commit(): void {
    if (draft === null) return
    const parsed = duration
      ? /^\d+$/.test(draft.trim()) && Number(draft) > 0
        ? String(Number(draft))
        : null
      : parseTime(draft)
    if (parsed && onCommit(parsed)) {
      setDraft(null)
      setInvalid(false)
    } else {
      setInvalid(true)
      toast.warn(duration ? '분 단위를 확인하세요.' : '시각을 확인하세요.')
    }
  }
  return (
    <div>
      <Input
        aria-label={label}
        aria-invalid={invalid}
        inputMode="numeric"
        className="text-center tabular-nums"
        value={draft ?? value}
        onFocus={(e) => {
          setDraft(value)
          e.currentTarget.select()
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          setInvalid(false)
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            setDraft(null)
            setInvalid(false)
          }
        }}
      />
    </div>
  )
}

export function TimetableSettings(): React.JSX.Element {
  const { data, setData, notify } = useWorkspace()
  const school = data.schools.find((s) => s.id === data.activeSchoolId)
  const [rows, setRows] = useState<Period[]>(() => school?.timetable ?? [])

  const [revision, setRevision] = useState(0)
  function replace(next: Period[]): void {
    setRows(next)

    setRevision((v) => v + 1)
  }
  function change(index: number, kind: 'start' | 'end' | 'duration', value: string): boolean {
    const row = rows[index]
    const end = kind === 'duration' ? minutes(row.start) + Number(value) : minutes(value)
    const delta = kind === 'start' ? minutes(value) - minutes(row.start) : end - minutes(row.end)
    if ((kind !== 'start' && end <= minutes(row.start)) || end >= 1440) return false
    const next = rows.map((period, i) => {
      if (i < index) return period
      if (i === index && kind !== 'start') return { ...period, end: format(end) }
      return {
        ...period,
        start: format(minutes(period.start) + delta),
        end: format(minutes(period.end) + delta)
      }
    })
    if (next.some((p) => !validTime(p.start) || !validTime(p.end))) return false
    setRows(next)

    return true
  }
  function save(): void {
    const invalid = rows.find(
      (p, i) =>
        !p.name.trim() ||
        !validTime(p.start) ||
        !validTime(p.end) ||
        p.end <= p.start ||
        (i > 0 && p.start < rows[i - 1].end)
    )
    if (invalid) {
      toast.error(
        `'${invalid.name || '이름 없음'}' 행을 확인하세요. 종료는 시작보다 늦고 다른 교시와 겹치지 않아야 합니다.`
      )
      return
    }
    if (document.querySelector('#settings-timetable [aria-invalid="true"]')) {
      toast.warn('입력 중인 시각과 소요 시간을 먼저 확인해 주세요.')
      return
    }
    setData((d) => ({
      ...d,
      schools: d.schools.map((s) =>
        s.id === d.activeSchoolId
          ? { ...s, timetable: rows.map((p) => ({ ...p, name: p.name.trim() })) }
          : s
      )
    }))

    notify('시간표가 저장되었습니다.', 'success')
  }
  return (
    <Surface id="settings-timetable" className="flex flex-col gap-5">
      <div>
        <h2>시간표(교시) 설정{data.schools.length > 1 ? ` — ${school?.name}` : ''}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          교시를 등록하면 상담 기록과 캘린더에서 교시 버튼으로 시간을 입력할 수 있습니다. 시각·소요
          시간을 바꾸면 아래 교시가 간격을 유지하며 이동합니다. 시간표는 학교별로 저장됩니다.
        </p>
      </div>
      {!rows.length ? (
        <Empty
          title="아직 등록된 시간표가 없습니다"
          description="학교급 기준 기본 시간표에서 시작해 학교에 맞게 고쳐보세요."
          action={
            <Button
              variant="secondary"
              onClick={() => replace(defaultSchoolTimetable(school?.type ?? ''))}
            >
              <RotateCcw size={15} />
              기본 시간표 만들기
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[530px] space-y-2" key={revision}>
              <div className="grid grid-cols-[minmax(100px,1.2fr)_1fr_1fr_100px_44px] items-center gap-3 px-1 text-xs text-slate-500">
                <span>교시</span>
                <span className="text-center">시작</span>
                <span className="text-center">종료</span>
                <span className="text-center">소요</span>
                <span />
              </div>
              {rows.map((row, index) => (
                <div
                  className="grid grid-cols-[minmax(100px,1.2fr)_1fr_1fr_100px_44px] items-start gap-3 rounded-lg p-1 hover:bg-slate-50"
                  key={index}
                >
                  <Input
                    aria-label={`${index + 1}행 교시`}
                    value={row.name}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((p, i) => (i === index ? { ...p, name: e.target.value } : p))
                      )
                    }
                  />
                  <EditableCell
                    label={`${index + 1}행 시작`}
                    value={row.start}
                    onCommit={(v) => change(index, 'start', v)}
                  />
                  <EditableCell
                    label={`${index + 1}행 종료`}
                    value={row.end}
                    onCommit={(v) => change(index, 'end', v)}
                  />
                  <div className="flex items-center gap-2">
                    <EditableCell
                      label={`${row.name} 소요 시간(분)`}
                      value={String(minutes(row.end) - minutes(row.start))}
                      duration
                      onCommit={(v) => change(index, 'duration', v)}
                    />
                    <span className="text-xs text-slate-500">분</span>
                  </div>
                  <Button
                    className="px-2"
                    variant="ghost"
                    aria-label={`${row.name} 행 삭제`}
                    onClick={() => replace(rows.filter((_, i) => i !== index))}
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                const last = rows[rows.length - 1]
                const start = last ? minutes(last.end) + 10 : 540
                const duration = last ? minutes(last.end) - minutes(last.start) : 45
                if (start + duration >= 1440) {
                  toast.warn('하루를 넘는 교시는 추가할 수 없습니다.')
                  return
                }
                replace([
                  ...rows,
                  {
                    name: `${rows.filter((p) => /^\d+교시$/.test(p.name)).length + 1}교시`,
                    start: format(start),
                    end: format(start + duration)
                  }
                ])
              }}
            >
              <Plus size={15} />행 추가
            </Button>
            <Button
              variant="ghost"
              onClick={() => replace(defaultSchoolTimetable(school?.type ?? ''))}
            >
              <RotateCcw size={15} />
              기본값으로 재생성
            </Button>
          </div>
        </>
      )}
      <p className="text-xs leading-relaxed text-slate-500">
        시각은 930 · 9:30 · 오후 1처럼 입력할 수 있습니다. 점심·방과후 시간도 행으로 추가하세요.
        모든 행을 지우고 저장하면 교시 버튼을 표시하지 않습니다.
      </p>

      <div>
        <Button onClick={save}>
          <Save size={15} />
          시간표 저장
        </Button>
      </div>
    </Surface>
  )
}
