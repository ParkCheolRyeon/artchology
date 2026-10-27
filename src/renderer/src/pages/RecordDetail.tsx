import { useState } from 'react'
import { ArrowLeft, ArrowRight, Pencil, Plus } from 'lucide-react'
import {
  ACTIVITIES,
  type Drawing,
  type Session,
  type Store,
  type Student
} from '../../../shared/model'
import { Badge, Button, Empty, Modal, PageHeading, SectionHeading } from '../components/ui'
import { dateLabel } from '../format'

export function Subnav({
  items,
  value,
  onChange,
  label
}: {
  items: readonly string[]
  value: string
  onChange: (value: string) => void
  label: string
}): React.JSX.Element {
  return (
    <nav className="filter-tabs depth-tabs" aria-label={label}>
      {items.map((item) => (
        <button
          key={item}
          aria-current={value === item ? 'page' : undefined}
          className={value === item ? 'active' : ''}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </nav>
  )
}

export function RecordTable({
  data,
  rows,
  open
}: {
  data: Store
  rows: Session[]
  open: (session: Session) => void
}): React.JSX.Element {
  return rows.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>일시</th>
            <th>학생</th>
            <th>상담 제목</th>
            <th>분류</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {row.date}
                <small className="table-secondary">
                  {row.time} · {row.duration}분
                </small>
              </td>
              <td>
                {data.students.find((student) => student.id === row.studentId)?.name ?? '학생 없음'}
              </td>
              <td>
                <button className="text-link" onClick={() => open(row)}>
                  {row.title}
                  <ArrowRight size={14} />
                </button>
              </td>
              <td>{row.category}</td>
              <td>
                <Badge tone={row.state === '완료' ? 'gray' : 'blue'}>{row.state}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      title="조건에 맞는 상담 기록이 없어요"
      description="기간이나 학생 조건을 바꾸어 주세요."
    />
  )
}

export function DrawingDetail({
  drawing,
  student,
  close
}: {
  drawing: Drawing
  student?: Student
  close: () => void
}): React.JSX.Element {
  const activity = ACTIVITIES.find((item) => item.id === drawing.activityId)
  return (
    <Modal
      title={activity?.name ?? '마음 그림'}
      subtitle={`${student?.name ?? '학생'} · ${dateLabel(drawing.createdAt.slice(0, 10))}`}
      onClose={close}
    >
      <img
        className="drawing-full"
        src={drawing.image}
        alt={`${student?.name ?? '학생'}의 ${activity?.name ?? '마음 그림'}`}
      />
      <section className="reading-block">
        <h3>학생의 설명과 관찰 메모</h3>
        <p className="preserve">{drawing.reflection || '기록한 메모가 없습니다.'}</p>
      </section>
      <div className="modal-footer">
        <Button onClick={close}>닫기</Button>
      </div>
    </Modal>
  )
}

export function DrawingGallery({
  data,
  studentId
}: {
  data: Store
  studentId?: string
}): React.JSX.Element {
  const [selected, setSelected] = useState<Drawing | null>(null)
  const [filter, setFilter] = useState(studentId ?? '')
  const rows = data.drawings
    .filter((row) => !filter || row.studentId === filter)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <>
      {!studentId && (
        <div className="list-toolbar">
          <h2>
            작품 보관함 <small>{rows.length}장</small>
          </h2>
          <select
            aria-label="작품 학생 필터"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">전체 학생</option>
            {data.students.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {rows.length ? (
        <div className="drawing-gallery">
          {rows.map((drawing) => {
            const student = data.students.find((row) => row.id === drawing.studentId)
            const activity = ACTIVITIES.find((row) => row.id === drawing.activityId)
            return (
              <button
                className="surface drawing-result drawing-open"
                key={drawing.id}
                onClick={() => setSelected(drawing)}
              >
                <img src={drawing.image} alt={`${student?.name}의 ${activity?.name}`} />
                <div>
                  <h3>{activity?.name}</h3>
                  <p>
                    {student?.name} · {dateLabel(drawing.createdAt.slice(0, 10))}
                  </p>
                  <p className="record-preview">{drawing.reflection || '메모 없음'}</p>
                  <span className="text-link">
                    작품 자세히 보기 <ArrowRight size={14} />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <Empty
          title="아직 마음 그림이 없어요"
          description="활동을 저장하면 이곳에서 그림과 관찰 메모를 함께 볼 수 있어요."
        />
      )}
      {selected && (
        <DrawingDetail
          drawing={selected}
          student={data.students.find((row) => row.id === selected.studentId)}
          close={() => setSelected(null)}
        />
      )}
    </>
  )
}

export function RecordDetail({
  data,
  session,
  back,
  edit,
  openStudent,
  openSession,
  add
}: {
  data: Store
  session: Session
  back: () => void
  edit: () => void
  openStudent: (student: Student) => void
  openSession: (session: Session) => void
  add: (studentId: string) => void
}): React.JSX.Element {
  const [tab, setTab] = useState('상담 내용')
  const student = data.students.find((row) => row.id === session.studentId)
  const history = data.sessions
    .filter((row) => row.studentId === session.studentId)
    .toSorted((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const index = history.findIndex((row) => row.id === session.id)
  return (
    <>
      <button className="back-link" onClick={back}>
        <ArrowLeft size={16} />
        이전 화면으로
      </button>
      <PageHeading
        title={session.title}
        subtitle={`${dateLabel(session.date)} · ${session.time} · ${session.duration}분`}
      >
        <Badge tone={session.state === '완료' ? 'gray' : 'blue'}>{session.state}</Badge>
        <Button variant="secondary" onClick={edit}>
          <Pencil size={15} />
          기록 수정
        </Button>
        <Button onClick={() => add(session.studentId)}>
          <Plus size={15} />
          다음 상담 예약
        </Button>
      </PageHeading>
      <div className="detail-layout">
        <aside>
          <section className="surface profile-info">
            <h2>상담 정보</h2>
            <label>참여 학생</label>
            {student && (
              <button className="text-link" onClick={() => openStudent(student)}>
                {student.name}
                <ArrowRight size={14} />
              </button>
            )}
            <label>소속</label>
            <p>
              {student
                ? `${student.grade}학년 ${student.classroom}반 ${student.number}번`
                : '학생 없음'}
            </p>
            <label>상담 분류</label>
            <p>{session.category}</p>
            <label>담당 상담사</label>
            <p>{data.settings.counselor}</p>
            <label>누적 완료 상담</label>
            <p>{history.filter((row) => row.state === '완료').length}회</p>
          </section>
        </aside>
        <section>
          <Subnav
            items={['상담 내용', '다음 계획', '학생 상담 이력', '마음 그림']}
            label="상담 상세 메뉴"
            value={tab}
            onChange={setTab}
          />
          {tab === '상담 내용' && (
            <section className="surface reading-block">
              <SectionHeading title={session.state === '예정' ? '상담 준비 메모' : '상담 내용'} />
              <p className="preserve">
                {session.note || '아직 상담 전입니다. 기록 수정에서 준비 메모를 남겨보세요.'}
              </p>
              {session.state === '예정' && (
                <Button variant="secondary" onClick={edit}>
                  상담 진행 후 기록 작성
                </Button>
              )}
            </section>
          )}
          {tab === '다음 계획' && (
            <section className="surface reading-block">
              <SectionHeading title="다음 상담 계획" />
              <p className="preserve">
                {session.nextPlan || '아직 다음 계획을 기록하지 않았어요.'}
              </p>
              <Button variant="secondary" onClick={edit}>
                계획 수정
              </Button>
            </section>
          )}
          {tab === '학생 상담 이력' && (
            <section className="surface">
              <RecordTable data={data} rows={history.toReversed()} open={openSession} />
            </section>
          )}
          {tab === '마음 그림' && <DrawingGallery data={data} studentId={session.studentId} />}
          <div className="record-pagination">
            <Button
              variant="secondary"
              disabled={index <= 0}
              onClick={() => openSession(history[index - 1])}
            >
              <ArrowLeft size={14} />
              이전 상담
            </Button>
            <span>
              {index + 1} / {history.length}
            </span>
            <Button
              variant="secondary"
              disabled={index >= history.length - 1}
              onClick={() => openSession(history[index + 1])}
            >
              다음 상담
              <ArrowRight size={14} />
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}
