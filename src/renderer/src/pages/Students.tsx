import { DrawingGallery, Subnav } from './RecordDetail'
import { Calendar } from './Dashboard'
import { localDate } from '../../../shared/model'
import { dateLabel } from '../format'
import { useState } from 'react'
import { Plus, ChevronRight, ArrowLeft, Pencil, CalendarDays, Palette, Users } from 'lucide-react'
import { CATEGORIES, STATUSES, type Store, type Student, type Session } from '../../../shared/model'
import {
  Avatar,
  Badge,
  Button,
  Empty,
  PageHeading,
  SearchInput,
  SectionHeading
} from '../components/ui'

export function Students({
  data,
  open,
  add
}: {
  data: Store
  open: (student: Student) => void
  add: () => void
}): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('전체')
  const [grade, setGrade] = useState('전체 학년')
  const [sort, setSort] = useState('이름순')
  const [category, setCategory] = useState('전체 주제')
  const rows = data.students
    .filter(
      (student) =>
        (grade === '전체 학년' || student.grade === Number(grade)) &&
        student.name.includes(search.trim()) &&
        (status === '전체' || student.status === status) &&
        (category === '전체 주제' || student.category === category)
    )
    .toSorted((a, b) =>
      sort === '이름순'
        ? a.name.localeCompare(b.name, 'ko')
        : sort === '학년순'
          ? a.grade - b.grade || a.classroom - b.classroom || a.number - b.number
          : b.createdAt.localeCompare(a.createdAt)
    )
  return (
    <>
      <PageHeading title="학생 관리" subtitle="한 사람의 이야기를 차근차근 쌓아갑니다.">
        <Button onClick={add}>
          <Plus size={17} />
          학생 등록
        </Button>
      </PageHeading>
      <div className="list-toolbar">
        <div className="filter-tabs">
          {['전체', ...STATUSES].map((value) => (
            <button
              className={status === value ? 'active' : ''}
              key={value}
              onClick={() => setStatus(value)}
            >
              {value}
              <span>
                {
                  data.students.filter((student) => value === '전체' || student.status === value)
                    .length
                }
              </span>
            </button>
          ))}
        </div>
        <div className="list-filters">
          <SearchInput value={search} onChange={setSearch} />
          <select aria-label="학년 필터" value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option>전체 학년</option>
            {[...new Set(data.students.map((row) => row.grade))]
              .sort((a, b) => a - b)
              .map((value) => (
                <option key={value} value={value}>
                  {value}학년
                </option>
              ))}
          </select>
          <select aria-label="학생 정렬" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option>이름순</option>
            <option>학년순</option>
            <option>등록일순</option>
          </select>
          <select
            aria-label="상담 주제 필터"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option>전체 주제</option>
            {CATEGORIES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="surface table-surface">
        <table>
          <thead>
            <tr>
              <th>학생</th>
              <th>학년 · 반 · 번호</th>
              <th>주요 상담 주제</th>
              <th>상담 상태</th>
              <th>최근 상담</th>
              <th>기록</th>
              <th>
                <span className="sr-only">상세</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((student) => {
              const sessions = data.sessions
                .filter((session) => session.studentId === student.id && session.state === '완료')
                .sort((a, b) => b.date.localeCompare(a.date))
              return (
                <tr key={student.id}>
                  <td>
                    <button className="student-name" onClick={() => open(student)}>
                      <Avatar student={student} />
                      <strong>{student.name}</strong>
                    </button>
                  </td>
                  <td>
                    {student.grade}학년 {student.classroom}반 {student.number}번
                  </td>
                  <td>{student.category}</td>
                  <td>
                    <Badge
                      tone={
                        student.status === '종결'
                          ? 'gray'
                          : student.status === '관찰 중'
                            ? 'amber'
                            : 'green'
                      }
                    >
                      {student.status}
                    </Badge>
                  </td>
                  <td>{sessions[0] ? dateLabel(sessions[0].date) : '첫 상담 전'}</td>
                  <td>{sessions.length}회</td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`${student.name} 상세 보기`}
                      onClick={() => open(student)}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <Empty
            title="조건에 맞는 학생이 없어요"
            description="이름이나 필터를 바꾸어 검색해 보세요."
          />
        )}
      </div>
      <div className="table-footer">
        <span>총 {rows.length}명의 학생</span>
        <span>모든 학생 정보는 가상 시연 데이터입니다.</span>
      </div>
    </>
  )
}
export function StudentDetail({
  student,
  data,
  back,
  edit,
  record,
  openSession,
  art
}: {
  student: Student
  data: Store
  back: () => void
  edit: () => void
  record: () => void
  openSession: (session: Session) => void
  art: () => void
}): React.JSX.Element {
  const [tab, setTab] = useState('상담 기록')
  const [ascending, setAscending] = useState(false)
  const sessions = data.sessions
    .filter((session) => session.studentId === student.id)
    .sort((a, b) => (ascending ? 1 : -1) * `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  return (
    <>
      <button className="back-link" onClick={back}>
        <ArrowLeft size={16} />
        학생 목록
      </button>
      <div className="profile-heading">
        <Avatar student={student} large />
        <div>
          <div className="inline">
            <h1>{student.name}</h1>
            <Badge
              tone={
                student.status === '종결'
                  ? 'gray'
                  : student.status === '관찰 중'
                    ? 'amber'
                    : 'green'
              }
            >
              {student.status}
            </Badge>
          </div>
          <p>
            {student.grade}학년 {student.classroom}반 {student.number}번<span>·</span>
            {student.category}
          </p>
        </div>
        <Button variant="secondary" onClick={edit}>
          <Pencil size={15} />
          정보 수정
        </Button>
        <Button onClick={record}>
          <Plus size={17} />
          상담 기록
        </Button>
      </div>
      <div className="detail-layout">
        <aside>
          <section className="surface profile-info">
            <h2>학생 이야기</h2>
            <label>상담 배경</label>
            <p className="preserve">{student.concern || '아직 등록된 상담 배경이 없습니다.'}</p>
            <div className="info-divider" />
            <label>보호자</label>
            <p>{student.guardian || '미등록'}</p>
            <label>보호자 연락처</label>
            <p>{student.phone || '미등록'}</p>
            <label>학생 등록일</label>
            <p>{dateLabel(student.createdAt)}</p>
          </section>
          <button className="activity-prompt" onClick={art}>
            <Palette size={21} />
            <strong>그림으로 이야기하기</strong>
            <span>
              이 학생과 드로잉 활동 시작
              <ChevronRight size={14} />
            </span>
          </button>
        </aside>
        <section>
          <Subnav
            items={['상담 기록', '기본 정보', '마음 그림']}
            value={tab}
            onChange={setTab}
            label="학생 상세 메뉴"
          />
          {tab === '기본 정보' && (
            <section className="surface reading-block">
              <SectionHeading title="학생 기본 정보" />
              <dl className="settings-description">
                <div>
                  <dt>학생</dt>
                  <dd>
                    {student.name} · {student.grade}학년 {student.classroom}반 {student.number}번
                  </dd>
                </div>
                <div>
                  <dt>상담 상태</dt>
                  <dd>{student.status}</dd>
                </div>
                <div>
                  <dt>주요 상담 주제</dt>
                  <dd>{student.category}</dd>
                </div>
                <div>
                  <dt>보호자</dt>
                  <dd>
                    {student.guardian || '미등록'} / {student.phone || '연락처 미등록'}
                  </dd>
                </div>
              </dl>
              <SectionHeading title="상담 배경" />
              <p className="preserve">{student.concern || '등록된 상담 배경이 없습니다.'}</p>
              <Button variant="secondary" onClick={edit}>
                기본 정보 수정
              </Button>
            </section>
          )}
          {tab === '마음 그림' && <DrawingGallery data={data} studentId={student.id} />}
          {tab === '상담 기록' && (
            <div className="list-toolbar">
              <span>
                전체 {sessions.length}회 · 완료{' '}
                {sessions.filter((row) => row.state === '완료').length}회
              </span>
              <button className="text-link" onClick={() => setAscending(!ascending)}>
                {ascending ? '과거순' : '최신순'} ↕
              </button>
            </div>
          )}
          {tab === '상담 기록' && (
            <div className="timeline">
              {sessions.length === 0 ? (
                <Empty
                  title="아직 상담 기록이 없어요"
                  action={<Button onClick={record}>첫 상담 기록</Button>}
                />
              ) : (
                sessions.map((session) => (
                  <article className="timeline-item" key={session.id}>
                    <div className="timeline-marker">
                      <i />
                    </div>
                    <div className="surface">
                      <div className="timeline-meta">
                        <time>
                          <CalendarDays size={14} />
                          {session.date} · {session.time}
                        </time>
                        <Badge tone={session.state === '예정' ? 'amber' : 'gray'}>
                          {session.state}
                        </Badge>
                      </div>
                      <button className="record-title" onClick={() => openSession(session)}>
                        {session.title}
                        <ChevronRight size={17} />
                      </button>
                      <p className="record-preview">
                        {session.note || '예정된 상담입니다. 상담 후 이야기를 남겨주세요.'}
                      </p>
                      <div className="timeline-bottom">
                        <span>
                          {session.category} · {session.duration}분
                        </span>
                        <button className="text-link" onClick={() => openSession(session)}>
                          기록 열기
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
export function Sessions({
  data,
  add,
  open
}: {
  data: Store
  add: () => void
  open: (session: Session) => void
}): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [state, setState] = useState('전체')
  const [view, setView] = useState('목록')
  const [selected, setSelected] = useState(localDate())
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const rows = data.sessions
    .filter(
      (session) =>
        (view === '달력' || !from || session.date >= from) &&
        (view === '달력' || !to || session.date <= to) &&
        (view !== '달력' || session.date === selected) &&
        (state === '전체' || session.state === state) &&
        `${session.title} ${data.students.find((student) => student.id === session.studentId)?.name}`.includes(
          search.trim()
        )
    )
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
  return (
    <>
      <PageHeading title="상담 기록" subtitle="함께 나눈 이야기와 작은 변화를 기록합니다.">
        <Button onClick={add}>
          <Plus size={17} />
          상담 기록
        </Button>
      </PageHeading>
      <Subnav items={['목록', '달력']} value={view} onChange={setView} label="상담 기록 보기" />
      {view === '달력' && (
        <section className="surface session-calendar">
          <Calendar selected={selected} onSelect={setSelected} sessions={data.sessions} />
          <p className="panel-note">날짜를 선택하면 아래 상담 목록이 바뀝니다.</p>
        </section>
      )}
      <div className="list-toolbar">
        <div className="filter-tabs">
          {['전체', '예정', '완료'].map((value) => (
            <button
              key={value}
              className={state === value ? 'active' : ''}
              onClick={() => setState(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="학생 이름 또는 상담 제목 검색"
        />
      </div>
      {view === '목록' && (
        <div className="date-filters">
          <label>
            시작일{' '}
            <input
              aria-label="상담 검색 시작일"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            종료일{' '}
            <input
              aria-label="상담 검색 종료일"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <Button
            variant="ghost"
            onClick={() => {
              setFrom('')
              setTo('')
              setSearch('')
              setState('전체')
            }}
          >
            조건 초기화
          </Button>
        </div>
      )}
      {from && to && from > to && (
        <p className="form-error" role="alert">
          시작일은 종료일보다 늦을 수 없습니다.
        </p>
      )}
      <section className="surface">
        <SectionHeading title="상담 목록" count={rows.length} />
        {rows.length === 0 ? (
          <Empty
            title="표시할 상담이 없어요"
            description="검색 조건을 바꾸거나 새 상담을 등록하세요."
          />
        ) : (
          rows.map((session) => {
            const student = data.students.find((student) => student.id === session.studentId)
            return (
              <button className="session-list-row" key={session.id} onClick={() => open(session)}>
                <span className="session-list-date">
                  <strong>{dateLabel(session.date)}</strong>
                  <small>
                    {session.time} · {session.duration}분
                  </small>
                </span>
                {student ? <Avatar student={student} /> : <Users size={20} />}
                <div className="session-list-title">
                  <strong>{session.title}</strong>
                  <p>
                    {student?.name} · {session.category}
                  </p>
                </div>
                <Badge tone={session.state === '완료' ? 'gray' : 'green'}>{session.state}</Badge>
                <ChevronRight size={18} />
              </button>
            )
          })
        )}
      </section>
    </>
  )
}
