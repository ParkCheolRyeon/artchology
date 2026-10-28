import { Input as TextInput } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { FormSelect, FormCheckbox, DateInput } from '../components/form-controls'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import FullCalendar, { type CalendarRef, type EventApi } from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import listPlugin from '@fullcalendar/react/list'
import interactionPlugin from '@fullcalendar/react/interaction'
import themePlugin from '@fullcalendar/react/themes/monarch'
import koLocale from '@fullcalendar/react/locales/ko'
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/monarch/theme.css'
import '@fullcalendar/react/themes/monarch/palettes/blue.css'
import { ChevronLeft, ChevronRight, Plus, Undo2, CalendarDays, Clock, Trash2 } from 'lucide-react'
import { useWorkspace } from './context'
import { day, uid, CATEGORIES, type Meeting } from './model'
import { Button, Field, Modal, Badge } from './ui'

const COLORS = ['#3196ff', '#6eaa96', '#8e7bc3', '#d99855', '#d77f8b']
const VIEWS = [
  { id: 'dayGridMonth', name: '월' },
  { id: 'timeGridWeek', name: '주' },
  { id: 'timeGridDay', name: '일' },
  { id: 'listWeek', name: '목록' }
]
function plusDay(value: string, amount: number): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  date.setDate(date.getDate() + amount)
  return day(date)
}
function localTime(value: Date): string {
  return `${day(value)}T${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
}
function blankMeeting(
  schoolId: string,
  start = `${day()}T09:00`,
  end = `${day()}T09:40`,
  allDay = false
): Meeting {
  return {
    id: uid(),
    schoolId,
    caseId: '',
    studentIds: [],
    title: '',
    start,
    end,
    allDay,
    category: '개인상담',
    categoryMedium: '학교생활',
    categoryDetail: '일반 상담',
    counselingClass: '상담',
    weeClass: 'Wee클래스',
    medium: '대면',
    target: '학생',
    crisis: '해당 없음',
    counselorAffiliation: '학교',
    neisTitle: '',
    neisContent: '',
    internalNotes: '',
    status: '예정',
    reminder: 10,
    color: COLORS[0],
    location: '상담실'
  }
}

export function ScheduleEditor({
  meeting,
  isNew,
  close
}: {
  meeting: Meeting
  isNew: boolean
  close: () => void
}): React.JSX.Element {
  const { data, setData, navigate, notify } = useWorkspace()
  const [draft, setDraft] = useState(meeting)
  const [lastDay, setLastDay] = useState(
    meeting.allDay ? plusDay(meeting.end, -1) : meeting.end.slice(0, 10)
  )
  const [error, setError] = useState(''),
    [deleting, setDeleting] = useState(false)
  const cases = data.cases.filter(
    (row) =>
      row.schoolId === data.activeSchoolId && (row.status === '진행' || row.id === draft.caseId)
  )
  function change<K extends keyof Meeting>(key: K, value: Meeting[K]): void {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }
  function save(event: FormEvent): void {
    event.preventDefault()
    const start = draft.allDay ? draft.start.slice(0, 10) : draft.start
    const end = draft.allDay ? plusDay(lastDay, 1) : draft.end
    if (!draft.title.trim()) {
      setError('일정 제목을 입력하세요.')
      return
    }
    if (new Date(end).getTime() <= new Date(start).getTime()) {
      setError('종료 일시는 시작 일시보다 뒤여야 합니다.')
      return
    }
    const saved = { ...draft, title: draft.title.trim(), start, end }
    setData((prev) => ({
      ...prev,
      sessions: isNew
        ? [...prev.sessions, saved]
        : prev.sessions.map((row) => (row.id === saved.id ? saved : row))
    }))
    notify(isNew ? '일정을 추가했습니다.' : '일정을 수정했습니다.')
    close()
  }
  return (
    <Modal
      title={isNew ? '새 일정' : '일정 상세'}
      subtitle="상담과 학교 일정을 한곳에서 관리하세요."
      onClose={close}
    >
      <form onSubmit={save}>
        <div className="form-grid">
          <Field label="일정 제목" full>
            <TextInput
              autoFocus
              required
              maxLength={100}
              value={draft.title}
              onChange={(e) => change('title', e.target.value)}
              placeholder="예: 개인상담, 마음 돌봄 주간"
            />
          </Field>
          <label className="wt-check field-full">
            <FormCheckbox
              checked={draft.allDay}
              onCheckedChange={(e) => {
                const allDay = e
                setDraft((prev) => ({
                  ...prev,
                  allDay,
                  start: allDay ? prev.start.slice(0, 10) : `${prev.start.slice(0, 10)}T09:00`,
                  end: allDay ? plusDay(lastDay, 1) : `${lastDay}T09:40`
                }))
              }}
            />
            종일 일정
          </label>
          <Field label="시작 일시">
            <DateInput
              type={draft.allDay ? 'date' : 'datetime-local'}
              required
              value={draft.start}
              onValueChange={(e) => change('start', e)}
            />
          </Field>
          <Field label={draft.allDay ? '마지막 날짜 (포함)' : '종료 일시'}>
            <DateInput
              type={draft.allDay ? 'date' : 'datetime-local'}
              required
              value={draft.allDay ? lastDay : draft.end}
              onValueChange={(e) => {
                if (draft.allDay) setLastDay(e)
                else {
                  change('end', e)
                  setLastDay(e.slice(0, 10))
                }
              }}
            />
          </Field>
          <Field label="연결 사례">
            <FormSelect
              value={draft.caseId}
              onValueChange={(e) => {
                const row = cases.find((row) => row.id === e)
                setDraft((prev) => ({
                  ...prev,
                  caseId: row?.id ?? '',
                  studentIds: row?.studentIds ?? []
                }))
              }}
            >
              <option value="">일반 일정 · 연결 안 함</option>
              {cases.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.number} ·{' '}
                  {row.studentIds
                    .map((id) => data.students.find((s) => s.id === id)?.name)
                    .join(', ')}
                </option>
              ))}
            </FormSelect>
          </Field>
          <Field label="일정 분류">
            <FormSelect value={draft.category} onValueChange={(e) => change('category', e)}>
              {CATEGORIES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </FormSelect>
          </Field>
          <Field label="장소">
            <TextInput
              value={draft.location}
              onChange={(e) => change('location', e.target.value)}
              placeholder="장소 추가"
            />
          </Field>
          <Field label="미리 알림">
            <FormSelect value={draft.reminder} onValueChange={(e) => change('reminder', Number(e))}>
              {[0, 5, 10, 15, 30, 60].map((value) => (
                <option key={value} value={value}>
                  {value ? `${value}분 전` : '없음'}
                </option>
              ))}
            </FormSelect>
          </Field>
          <Field label="메모" full>
            <Textarea
              rows={3}
              value={draft.internalNotes}
              onChange={(e) => change('internalNotes', e.target.value)}
              placeholder="일정에 필요한 내용을 남겨주세요."
            />
          </Field>
          <div className="field-full wt-color-picker">
            <span>일정 색상</span>
            {COLORS.map((color) => (
              <button
                type="button"
                key={color}
                aria-label={`일정 색상 ${color}`}
                aria-pressed={color === draft.color}
                style={{ background: color }}
                onClick={() => change('color', color)}
              />
            ))}
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {deleting && (
          <div className="wt-warning">
            <p>이 일정을 삭제할까요? 연결된 사례는 유지됩니다.</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setData((prev) => ({
                  ...prev,
                  sessions: prev.sessions.filter((row) => row.id !== draft.id)
                }))
                notify('일정을 삭제했습니다.')
                close()
              }}
            >
              일정 삭제 확인
            </Button>
          </div>
        )}
        <div className="modal-footer">
          {!isNew && (
            <Button type="button" variant="ghost" onClick={() => setDeleting(!deleting)}>
              <Trash2 size={15} />
              삭제
            </Button>
          )}
          {!isNew && draft.caseId && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                close()
                navigate(`/cases/${draft.caseId}/sessions/${draft.id}`)
              }}
            >
              상담 기록 열기
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={close}>
            취소
          </Button>
          <Button type="submit">{isNew ? '일정 추가' : '변경 저장'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function CalendarWorkspace({ compact = false }: { compact?: boolean }): React.JSX.Element {
  const { data, setData, notify } = useWorkspace()
  const ref = useRef<CalendarRef>(null)
  const [view, setView] = useState('dayGridMonth'),
    [title, setTitle] = useState(''),
    [weekends, setWeekends] = useState(true),
    [filter, setFilter] = useState('전체')
  const [editing, setEditing] = useState<{ meeting: Meeting; isNew: boolean } | null>(null)
  const [undo, setUndo] = useState<Meeting | null>(null)
  const rows = data.sessions.filter(
    (row) => row.schoolId === data.activeSchoolId && (filter === '전체' || row.category === filter)
  )
  const events = useMemo(
    () =>
      data.sessions
        .filter(
          (row) =>
            row.schoolId === data.activeSchoolId && (filter === '전체' || row.category === filter)
        )
        .map((row) => ({
          id: row.id,
          title: row.title,
          start: row.start,
          end: row.end,
          allDay: row.allDay,
          color: row.color,
          extendedProps: { category: row.category }
        })),
    [data.sessions, data.activeSchoolId, filter]
  )
  function editRange(start: string, end: string, allDay: boolean): void {
    setEditing({
      meeting: blankMeeting(
        data.activeSchoolId,
        start.slice(0, allDay ? 10 : 16),
        end.slice(0, allDay ? 10 : 16),
        allDay
      ),
      isNew: true
    })
  }
  function moveEvent(event: EventApi): void {
    const previous = data.sessions.find((row) => row.id === event.id)
    if (!previous || !event.start) return
    const end = event.end ?? new Date(event.start.getTime() + (event.allDay ? 86400000 : 2400000))
    setUndo(previous)
    setData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((row) =>
        row.id === event.id
          ? {
              ...row,
              start: event.allDay ? day(event.start!) : localTime(event.start!),
              end: event.allDay ? day(end) : localTime(end),
              allDay: event.allDay
            }
          : row
      )
    }))
    notify('일정 시간을 변경했습니다.')
  }
  return (
    <section
      className={`wt-calendar surface ${compact ? 'is-compact' : ''}`}
      aria-label="상담 캘린더"
    >
      <div className="wt-calendar-toolbar">
        <div className="wt-calendar-title">
          <h2>{title}</h2>
          <div className="wt-calendar-arrows">
            <button aria-label="이전 기간" onClick={() => ref.current?.getApi().prev()}>
              <ChevronLeft size={17} />
            </button>
            <button onClick={() => ref.current?.getApi().today()}>오늘</button>
            <button aria-label="다음 기간" onClick={() => ref.current?.getApi().next()}>
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
        <div className="wt-actions">
          <div className="wt-segment" role="group" aria-label="캘린더 보기">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                aria-pressed={view === item.id}
                className={view === item.id ? 'active' : ''}
                onClick={() => {
                  setView(item.id)
                  ref.current?.getApi().changeView(item.id)
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
          <Button
            onClick={() => setEditing({ meeting: blankMeeting(data.activeSchoolId), isNew: true })}
          >
            <Plus size={16} />새 일정
          </Button>
        </div>
      </div>
      <div className="wt-calendar-filter">
        <label>
          <span className="wt-calendar-dot" />
          나의 상담 일정{' '}
          <FormSelect aria-label="캘린더 분류" value={filter} onValueChange={(e) => setFilter(e)}>
            <option>전체</option>
            {CATEGORIES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </FormSelect>
        </label>
        <label className="wt-check">
          <FormCheckbox checked={weekends} onCheckedChange={(e) => setWeekends(e)} />
          주말 표시
        </label>
        <span className="wt-muted">{rows.length}개의 일정</span>
        {undo && (
          <button
            className="text-link"
            onClick={() => {
              setData((prev) => ({
                ...prev,
                sessions: prev.sessions.map((row) => (row.id === undo.id ? undo : row))
              }))
              setUndo(null)
              notify('이전 일정으로 되돌렸습니다.')
            }}
          >
            <Undo2 size={14} />
            이동 되돌리기
          </button>
        )}
      </div>
      <FullCalendar
        ref={ref}
        eventClass={(info) => `wt-fc-event ${info.isMirror ? 'wt-fc-mirror' : ''}`}
        eventAfterClass={(info) => (info.isEndResizable ? 'wt-fc-resizer-end' : '')}
        dayCellClass={(info) => `wt-fc-day ${info.isToday ? 'wt-fc-today' : ''}`}
        dayCellDidMount={(info) => {
          info.el.dataset.date = day(info.date)
        }}
        dayHeaderClass="wt-fc-header"
        slotLaneClass="wt-fc-slot"
        slotHeaderClass="wt-fc-slot-label"
        slotLaneDidMount={(info) => {
          if (info.time) info.el.dataset.time = String(info.time.milliseconds)
        }}
        plugins={[themePlugin, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        locale={koLocale}
        initialView="dayGridMonth"
        headerToolbar={false}
        height={compact ? 540 : 'max(480px, calc(100vh - 365px))'}
        events={events}
        weekends={weekends}
        editable
        selectable
        selectMirror
        selectMinDistance={5}
        eventResizableFromStart
        eventDurationEditable
        eventStartEditable
        dayMaxEvents={3}
        nowIndicator
        allDayMaintainDuration
        snapDuration="00:15:00"
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        scrollTime="08:00:00"
        firstDay={0}
        fixedWeekCount={false}
        datesSet={(info) => {
          setTitle(info.view.title)
          setView(info.view.type)
        }}
        select={(info) => {
          editRange(info.startStr, info.endStr, info.allDay)
          ref.current?.getApi().unselect()
        }}
        dateClick={(info) => {
          const end = new Date(info.date.getTime() + (info.allDay ? 86400000 : 2400000))
          editRange(info.dateStr, info.allDay ? day(end) : localTime(end), info.allDay)
        }}
        eventClick={(info) => {
          const row = data.sessions.find((row) => row.id === info.event.id)
          if (row) setEditing({ meeting: row, isNew: false })
        }}
        eventDrop={(info) => moveEvent(info.event)}
        eventResize={(info) => moveEvent(info.event)}
        eventDidMount={(info) => {
          info.el.dataset.eventId = info.event.id
          info.el.title = info.event.title
        }}
      />
      <div className="wt-calendar-foot">
        <CalendarDays size={14} />
        <span>빈 날짜를 클릭하거나 드래그해 일정을 만들고, 일정을 끌어 이동하세요.</span>
        <Clock size={14} />
        <span>시간대: 서울</span>
        <Badge tone="blue">화면 PoC</Badge>
      </div>
      {editing && (
        <ScheduleEditor
          meeting={editing.meeting}
          isNew={editing.isNew}
          close={() => setEditing(null)}
        />
      )}
    </section>
  )
}
