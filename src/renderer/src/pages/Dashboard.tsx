import { dateLabel } from '../format'
import { useState } from 'react'
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  Leaf,
  Clock3,
  CalendarDays
} from 'lucide-react'
import { type Store, type Student, type Session, localDate } from '../../../shared/model'
import { Avatar, Badge, Button, Empty, SectionHeading } from '../components/ui'

export function Calendar({
  selected,
  onSelect,
  sessions
}: {
  selected: string
  onSelect: (value: string) => void
  sessions: Session[]
}): React.JSX.Element {
  const [month, setMonth] = useState(() => {
    const date = new Date(`${selected}T12:00:00`)
    date.setDate(1)
    return date
  })
  const year = month.getFullYear()
  const index = month.getMonth()
  const total = new Date(year, index + 1, 0).getDate()
  const offset = month.getDay()
  const marked = new Set(sessions.map((session) => session.date))
  return (
    <div className="calendar">
      <div className="calendar-heading">
        <h3>
          {year}년 {index + 1}월
        </h3>
        <div>
          <button
            className="text-link"
            onClick={() => {
              const today = new Date()
              today.setDate(1)
              setMonth(today)
              onSelect(localDate())
            }}
          >
            오늘 보기
          </button>
          <button
            className="icon-button"
            aria-label="이전 달"
            onClick={() => setMonth(new Date(year, index - 1, 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="다음 달"
            onClick={() => setMonth(new Date(year, index + 1, 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <span className="weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const date = localDate(new Date(year, index, i + 1))
          return (
            <button
              key={date}
              aria-label={`${date} 일정`}
              aria-pressed={date === selected}
              className={`${date === selected ? 'selected' : ''} ${date === localDate() ? 'today' : ''}`}
              onClick={() => onSelect(date)}
            >
              {i + 1}
              {marked.has(date) && <i />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
export function Dashboard({
  data,
  openStudent,
  openSession,
  newSession,
  scheduleSession,
  goStudents,
  goSessions,
  goArt
}: {
  data: Store
  openStudent: (student: Student) => void
  openSession: (session: Session) => void
  newSession: () => void
  scheduleSession: (date: string) => void
  goStudents: () => void
  goSessions: () => void
  goArt: () => void
}): React.JSX.Element {
  const [selected, setSelected] = useState(localDate())
  const scheduled = data.sessions
    .filter((session) => session.date === selected)
    .sort((a, b) => a.time.localeCompare(b.time))
  const recent = data.sessions
    .filter((session) => session.state === '완료')
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
    .slice(0, 3)
  const month = localDate().slice(0, 7)
  const monthSessions = data.sessions.filter(
    (session) => session.date.startsWith(month) && session.state === '완료'
  ).length
  const now = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
  return (
    <>
      <div className="dashboard-heading">
        <div className="date-caption">{now}</div>
        <div className="greeting">
          <div>
            <h1>마음을 살피는 하루의 시작</h1>
            <p>{data.settings.counselor} 선생님, 오늘도 아이들의 이야기에 귀 기울여 주세요.</p>
          </div>
          <Button onClick={newSession}>
            <Plus size={17} />
            상담 기록
          </Button>
        </div>
      </div>
      <div className="summary-strip">
        <button onClick={goStudents}>
          <span className="metric-label">함께하는 학생</span>
          <strong>
            {data.students.filter((student) => student.status !== '종결').length}
            <small>명</small>
          </strong>
          <ArrowUpRight size={18} />
        </button>
        <button onClick={goSessions}>
          <span className="metric-label">이번 달 상담</span>
          <strong>
            {monthSessions}
            <small>회</small>
          </strong>
          <ArrowUpRight size={18} />
        </button>
        <button onClick={() => setSelected(localDate())}>
          <span className="metric-label">오늘의 일정</span>
          <strong>
            {data.sessions.filter((session) => session.date === localDate()).length}
            <small>건</small>
          </strong>
          <CalendarDays size={18} />
        </button>
        <button onClick={goArt}>
          <span className="metric-label">쌓여가는 마음 그림</span>
          <strong>
            {data.drawings.length}
            <small>장</small>
          </strong>
          <Leaf size={18} />
        </button>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="surface schedule">
            <SectionHeading
              title={selected === localDate() ? '오늘의 상담' : `${dateLabel(selected)} 상담`}
              count={scheduled.length}
              onClick={() => scheduleSession(selected)}
              action="일정 추가"
            />
            <div className="schedule-date">
              <span />
              {selected === localDate() ? '오늘, ' : ''}
              {dateLabel(selected)}
              <span className="subtle">학생과 만나는 시간</span>
            </div>
            {scheduled.length === 0 ? (
              <Empty
                title="예정된 상담이 없어요"
                description="새 상담을 등록하거나 달력에서 다른 날짜를 선택하세요."
              />
            ) : (
              scheduled.map((session) => {
                const student = data.students.find((student) => student.id === session.studentId)
                if (!student) return null
                return (
                  <button
                    className="schedule-row"
                    onClick={() => openSession(session)}
                    key={session.id}
                  >
                    <div className="schedule-time">
                      <strong>{session.time}</strong>
                      <span>{session.duration}분</span>
                    </div>
                    <div className="schedule-line" />
                    <Avatar student={student} />
                    <div className="schedule-info">
                      <strong>
                        {student.name}
                        <span>
                          {student.grade}학년 {student.classroom}반
                        </span>
                      </strong>
                      <p>{session.title}</p>
                    </div>
                    <Badge tone={session.state === '완료' ? 'gray' : 'green'}>
                      {session.state === '완료' ? '상담 완료' : '상담 예정'}
                    </Badge>
                    <ChevronRight className="row-chevron" size={18} />
                  </button>
                )
              })
            )}
          </section>
          <section className="surface recent">
            <SectionHeading title="최근 상담 기록" onClick={goSessions} />
            {recent.length ? (
              recent.map((session) => {
                const student = data.students.find((student) => student.id === session.studentId)
                if (!student) return null
                return (
                  <button
                    className="recent-row"
                    key={session.id}
                    onClick={() => openSession(session)}
                  >
                    <span className="record-icon">
                      <Clock3 size={17} />
                    </span>
                    <div>
                      <strong>{session.title}</strong>
                      <p>
                        {student.name}
                        <span>·</span>
                        {session.category}
                      </p>
                    </div>
                    <time>{dateLabel(session.date)}</time>
                    <ChevronRight size={16} />
                  </button>
                )
              })
            ) : (
              <Empty title="첫 상담 기록을 남겨보세요" />
            )}
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="surface">
            <Calendar selected={selected} onSelect={setSelected} sessions={data.sessions} />
            <div className="calendar-legend">
              <i />
              상담 일정이 있는 날
            </div>
          </section>
          <section className="art-banner">
            <span className="art-brand">
              artbonbon <span>마음 그리기</span>
            </span>
            <div className="garden-art" aria-hidden="true">
              <i className="leaf leaf-one" />
              <i className="leaf leaf-two" />
              <i className="leaf leaf-three" />
              <span className="sun" />
              <span className="stem" />
              <span className="hill" />
            </div>
            <h2>
              말로 다 못한 마음,
              <br />
              그림으로 만나보세요.
            </h2>
            <p>
              아이의 속도에 맞춰 시작하는
              <br />
              작은 표현 활동
            </p>
            <button onClick={goArt}>
              드로잉 활동 둘러보기
              <ArrowRight size={16} />
            </button>
          </section>
        </aside>
      </div>
      <section className="student-preview">
        <SectionHeading title="함께 살펴볼 학생" onClick={goStudents} />
        <div className="student-preview-grid">
          {data.students
            .filter((student) => student.status !== '종결')
            .slice(0, 4)
            .map((student) => (
              <button key={student.id} onClick={() => openStudent(student)}>
                <Avatar student={student} />
                <div>
                  <strong>{student.name}</strong>
                  <p>
                    {student.grade}학년 {student.classroom}반 · {student.category}
                  </p>
                </div>
                <ArrowUpRight size={17} />
              </button>
            ))}
        </div>
      </section>
    </>
  )
}
