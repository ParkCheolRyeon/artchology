import { errorMessage } from '../format'
import { useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Check,
  FileText,
  FolderArchive,
  ShieldCheck
} from 'lucide-react'
import {
  APP,
  CATEGORIES,
  STATUSES,
  filterSessions,
  type Settings,
  type Store,
  type Student,
  type Session,
  type ExportKind,
  type ReportFilter
} from '../../../shared/model'
import { Button, Field, PageHeading, SectionHeading, Empty, Modal } from '../components/ui'
import { Subnav, RecordTable } from './RecordDetail'

type ExportFile = (kind: ExportKind, filter?: ReportFilter) => Promise<void>

export function Statistics({
  data,
  openSession,
  openStudent
}: {
  data: Store
  openSession: (session: Session) => void
  openStudent: (student: Student) => void
}): React.JSX.Element {
  const [tab, setTab] = useState('요약')
  const [month, setMonth] = useState('전체')
  const [detail, setDetail] = useState<{ title: string; category?: string; month?: string } | null>(
    null
  )
  const months = [...new Set(data.sessions.map((session) => session.date.slice(0, 7)))]
    .sort()
    .reverse()
  const rows = data.sessions.filter(
    (session) => session.state === '완료' && (month === '전체' || session.date.startsWith(month))
  )
  const categories = CATEGORIES.map((category) => ({
    category,
    count: rows.filter((session) => session.category === category).length
  }))
  const max = Math.max(1, ...categories.map((item) => item.count))
  const detailRows = rows.filter(
    (row) =>
      (!detail?.category || row.category === detail.category) &&
      (!detail?.month || row.date.startsWith(detail.month))
  )
  function changeTab(value: string): void {
    setTab(value)
    setDetail(null)
  }
  return (
    <>
      <PageHeading title="상담 통계" subtitle="기록에 담긴 흐름을 살펴보고 다음 만남을 준비합니다.">
        <select
          aria-label="통계 기간"
          value={month}
          onChange={(event) => {
            setMonth(event.target.value)
            setDetail(null)
          }}
        >
          <option>전체</option>
          {months.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </PageHeading>
      <Subnav
        items={['요약', '상담 분류', '시간 흐름', '학생 현황']}
        value={tab}
        onChange={changeTab}
        label="통계 하위 메뉴"
      />
      {detail ? (
        <section className="surface">
          <button className="back-link" onClick={() => setDetail(null)}>
            <ArrowLeft size={16} />
            통계로 돌아가기
          </button>
          <SectionHeading title={detail.title} count={detailRows.length} />
          <RecordTable data={data} rows={detailRows} open={openSession} />
        </section>
      ) : (
        <>
          <div className="stat-overview">
            <button onClick={() => setDetail({ title: '완료된 상담' })}>
              <span>완료된 상담</span>
              <strong>
                {rows.length}
                <small>회</small>
              </strong>
              <span>기록 보기 →</span>
            </button>
            <div>
              <span>상담 참여 학생</span>
              <strong>
                {new Set(rows.map((row) => row.studentId)).size}
                <small>명</small>
              </strong>
            </div>
            <div>
              <span>함께한 시간</span>
              <strong>
                {rows.reduce((sum, row) => sum + row.duration, 0)}
                <small>분</small>
              </strong>
            </div>
          </div>
          {(tab === '요약' || tab === '상담 분류') && (
            <section className="surface stats-section">
              <SectionHeading title="상담 주제별 현황" />
              {rows.length ? (
                <div className="bars">
                  {categories.map((item) => (
                    <button
                      className="bar-row bar-button"
                      key={item.category}
                      onClick={() =>
                        setDetail({ title: `${item.category} 상담 기록`, category: item.category })
                      }
                    >
                      <span>{item.category}</span>
                      <span className="bar-track">
                        <span style={{ width: `${(item.count / max) * 100}%` }} />
                      </span>
                      <strong>{item.count}회</strong>
                      <ArrowRight size={14} />
                    </button>
                  ))}
                </div>
              ) : (
                <Empty title="선택한 기간에 완료된 상담이 없어요" />
              )}
              <p className="panel-note">
                분류를 누르면 집계에 포함된 상담 기록을 확인할 수 있어요.
              </p>
            </section>
          )}
          {(tab === '요약' || tab === '시간 흐름') && (
            <section className="surface stats-section">
              <SectionHeading title="월별 상담 흐름" />
              {rows.length ? (
                <div className="month-grid">
                  {months
                    .filter((value) => month === '전체' || value === month)
                    .map((value) => {
                      const items = rows.filter((row) => row.date.startsWith(value))
                      return (
                        <button
                          key={value}
                          onClick={() => setDetail({ title: `${value} 상담 기록`, month: value })}
                        >
                          <span>{value}</span>
                          <strong>
                            {items.length}
                            <small>회</small>
                          </strong>
                          <span>
                            학생 {new Set(items.map((row) => row.studentId)).size}명 ·{' '}
                            {items.reduce((sum, row) => sum + row.duration, 0)}분
                          </span>
                        </button>
                      )
                    })}
                </div>
              ) : (
                <Empty title="집계할 완료 상담이 없어요" />
              )}
            </section>
          )}
          {tab === '학생 현황' && (
            <>
              <section className="surface stats-section">
                <SectionHeading title="학생 상담 상태" />
                <div className="status-summary">
                  {STATUSES.map((status) => (
                    <div key={status}>
                      <span>{status}</span>
                      <strong>
                        {data.students.filter((student) => student.status === status).length}
                        <small>명</small>
                      </strong>
                    </div>
                  ))}
                </div>
                <p className="panel-note">
                  상태는 현재 등록 정보, 아래 상담 횟수는 선택한 기간을 기준으로 표시합니다.
                </p>
              </section>
              <section className="surface">
                <table>
                  <thead>
                    <tr>
                      <th>학생</th>
                      <th>현재 상태</th>
                      <th>완료 상담</th>
                      <th>상담 시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((student) => {
                      const sessions = rows.filter((row) => row.studentId === student.id)
                      return (
                        <tr key={student.id}>
                          <td>
                            <button className="text-link" onClick={() => openStudent(student)}>
                              {student.name}
                              <ArrowRight size={14} />
                            </button>
                          </td>
                          <td>{student.status}</td>
                          <td>{sessions.length}회</td>
                          <td>{sessions.reduce((sum, row) => sum + row.duration, 0)}분</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!data.students.length && <Empty title="등록된 학생이 없어요" />}
              </section>
            </>
          )}
        </>
      )}
    </>
  )
}

export function BackupPanel({
  data,
  exportFile,
  restore
}: {
  data: Store
  exportFile: ExportFile
  restore?: () => Promise<void>
}): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Store | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="export-grid">
        <section className="surface export-card">
          <span className="export-icon blue">
            <FolderArchive size={26} />
          </span>
          <h2>전체 데이터 백업</h2>
          <p>
            학생과 상담 기록, 마음 그림과 설정을
            <br />
            하나의 JSON 파일로 보관합니다.
          </p>
          <div className="export-summary">
            <span>학생 {data.students.length}명</span>
            <strong>
              상담 {data.sessions.length}건 · 그림 {data.drawings.length}장
            </strong>
          </div>
          <Button disabled={busy} onClick={() => void run(() => exportFile('backup'))}>
            <Download size={16} />
            백업 파일 저장
          </Button>
        </section>
        {restore && (
          <section className="surface export-card">
            <span className="export-icon">
              <ShieldCheck size={26} />
            </span>
            <h2>백업에서 복원</h2>
            <p>
              백업을 선택한 뒤 내용을 확인합니다.
              <br />
              복원 전 현재 데이터는 자동으로 별도 보관합니다.
            </p>
            <div className="export-summary">
              <span>지원 형식</span>
              <strong>Artchology JSON 백업</strong>
            </div>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await window.api.selectBackup()
                  if (!result.ok) throw new Error(result.error)
                  setPreview(result.data)
                  setConfirmed(false)
                })
              }
            >
              복원할 백업 선택
            </Button>
          </section>
        )}
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {preview && restore && (
        <Modal
          title="백업 복원 확인"
          subtitle="복원하면 현재 목록이 선택한 백업의 내용으로 바뀝니다."
          onClose={() => {
            setPreview(null)
            setError('')
          }}
          busy={busy}
        >
          <section className="reading-block">
            <h3>{preview.settings.school}</h3>
            <p>
              학생 {preview.students.length}명 · 상담 {preview.sessions.length}건 · 마음 그림{' '}
              {preview.drawings.length}장
            </p>
            <p>기존 데이터는 앱 데이터 폴더의 before-restore 파일로 보관됩니다.</p>
            <label className="check-line">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              현재 데이터를 이 백업으로 교체하는 것을 확인했습니다.
            </label>
          </section>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setPreview(null)
                setError('')
              }}
            >
              취소
            </Button>
            <Button
              disabled={!confirmed || busy}
              onClick={() =>
                void run(async () => {
                  await restore()
                  setPreview(null)
                })
              }
            >
              {busy ? '복원 중…' : '확인한 백업 복원'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function Reports({
  data,
  exportFile,
  openSession
}: {
  data: Store
  exportFile: ExportFile
  openSession: (session: Session) => void
}): React.JSX.Element {
  const [tab, setTab] = useState('상담관리대장')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [studentId, setStudentId] = useState('')
  const [state, setState] = useState('전체')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const filter: ReportFilter = {
    from: from || undefined,
    to: to || undefined,
    studentId: studentId || undefined,
    state: state === '완료' || state === '예정' ? state : undefined
  }
  const invalid = Boolean(from && to && from > to)
  const rows = invalid ? [] : filterSessions(data.sessions, filter)
  const completed = rows.filter((row) => row.state === '완료')
  async function run(kind: ExportKind): Promise<void> {
    setBusy(true)
    setError('')
    try {
      await exportFile(kind, filter)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeading
        title="보고서 · 내보내기"
        subtitle="필요한 기간과 학생을 선택하고, 내용을 확인한 뒤 저장합니다."
      />
      <Subnav
        items={['상담관리대장', '학생별 기록', '관리자 보고서', '백업']}
        value={tab}
        onChange={(value) => {
          setTab(value)
          setError('')
          setStudentId('')
        }}
        label="보고서 하위 메뉴"
      />
      {tab === '백업' ? (
        <BackupPanel data={data} exportFile={exportFile} />
      ) : (
        <>
          <section className="surface report-filters">
            <Field label="시작일">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="종료일">
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label="보고서 학생">
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">
                  {tab === '학생별 기록' ? '학생을 선택하세요' : '전체 학생'}
                </option>
                {data.students.map((student) => (
                  <option value={student.id} key={student.id}>
                    {student.name} · {student.grade}학년 {student.classroom}반
                  </option>
                ))}
              </select>
            </Field>
            <Field label="보고서 상담 상태">
              <select value={state} onChange={(e) => setState(e.target.value)}>
                <option>전체</option>
                <option>완료</option>
                <option>예정</option>
              </select>
            </Field>
            <Button
              variant="ghost"
              onClick={() => {
                setFrom('')
                setTo('')
                setStudentId('')
                setState('전체')
              }}
            >
              초기화
            </Button>
          </section>
          {invalid && (
            <p role="alert" className="form-error">
              시작일은 종료일보다 늦을 수 없습니다.
            </p>
          )}
          {tab === '학생별 기록' && !studentId ? (
            <Empty
              title="기록을 살펴볼 학생을 선택하세요"
              description="학생의 전체 상담 이력을 기간별로 모아 볼 수 있어요."
            />
          ) : (
            <section className="surface report-preview">
              <div className="section-heading">
                <h2>
                  {tab} 미리보기 <span>{rows.length}건</span>
                </h2>
                <Button
                  disabled={busy || invalid || !rows.length}
                  onClick={() => void run(tab === '관리자 보고서' ? 'report' : 'sessions')}
                >
                  <Download size={16} />
                  {busy ? '저장 중…' : tab === '관리자 보고서' ? 'PDF 저장' : 'CSV 내보내기'}
                </Button>
              </div>
              {tab === '관리자 보고서' && (
                <div className="report-cover">
                  <span>{data.settings.school}</span>
                  <h2>상담 운영 보고서</h2>
                  <p>
                    {from || '전체 기록'} ~ {to || '현재'} · {data.settings.counselor}
                  </p>
                  <div className="status-summary">
                    <div>
                      <span>완료 상담</span>
                      <strong>
                        {completed.length}
                        <small>회</small>
                      </strong>
                    </div>
                    <div>
                      <span>참여 학생</span>
                      <strong>
                        {new Set(completed.map((row) => row.studentId)).size}
                        <small>명</small>
                      </strong>
                    </div>
                    <div>
                      <span>상담 시간</span>
                      <strong>
                        {completed.reduce((sum, row) => sum + row.duration, 0)}
                        <small>분</small>
                      </strong>
                    </div>
                  </div>
                  <p className="panel-note">
                    상담 상세 내용과 보호자 연락처는 PDF에 포함되지 않습니다.
                  </p>
                </div>
              )}
              <RecordTable data={data} rows={rows} open={openSession} />
            </section>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="report-note">
            <FileText size={22} />
            <div>
              <h3>미리보기와 같은 범위로 저장됩니다</h3>
              <p>
                CSV에는 상담 내용과 다음 계획이 포함됩니다. 일반 상담 양식이며 나이스 업로드 전용
                양식은 아닙니다.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export function SettingsPage({
  settings,
  data,
  save,
  exportFile,
  restore
}: {
  settings: Settings
  data: Store
  save: (settings: Settings) => Promise<void>
  exportFile: ExportFile
  restore: () => Promise<void>
}): React.JSX.Element {
  const [tab, setTab] = useState('기본 정보')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await save({
        school: String(values.get('school')),
        counselor: String(values.get('counselor'))
      })
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeading title="설정" subtitle="선생님의 상담 공간과 기록 보관 방식을 관리합니다." />
      <Subnav
        items={['기본 정보', '백업 · 복원', '앱 정보']}
        value={tab}
        onChange={setTab}
        label="설정 하위 메뉴"
      />
      {tab === '기본 정보' && (
        <section className="surface settings-surface">
          <SectionHeading title="학교 · 상담사 정보" />
          <form onSubmit={submit}>
            <fieldset className="form-grid" disabled={busy}>
              <Field label="학교 이름">
                <input name="school" required maxLength={60} defaultValue={settings.school} />
              </Field>
              <Field label="상담 선생님">
                <input name="counselor" required maxLength={40} defaultValue={settings.counselor} />
              </Field>
            </fieldset>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <Button disabled={busy} type="submit">
              <Check size={16} />
              {busy ? '저장 중…' : '변경 저장'}
            </Button>
          </form>
          <p className="panel-note">
            저장한 정보는 홈 화면, 상담 상세, 내보내는 보고서에 함께 반영됩니다.
          </p>
        </section>
      )}
      {tab === '백업 · 복원' && (
        <BackupPanel data={data} exportFile={exportFile} restore={restore} />
      )}
      {tab === '앱 정보' && (
        <section className="surface settings-surface">
          <SectionHeading title="나의 상담 공간" />
          <dl className="settings-description">
            <div>
              <dt>앱 이름</dt>
              <dd>{APP.name} · 데스크톱 프로토타입</dd>
            </div>
            <div>
              <dt>저장 방식</dt>
              <dd>이 컴퓨터의 앱 데이터 폴더 · {APP.database}</dd>
            </div>
            <div>
              <dt>저장된 기록</dt>
              <dd>
                학생 {data.students.length}명 / 상담 {data.sessions.length}건 / 마음 그림{' '}
                {data.drawings.length}장
              </dd>
            </div>
            <div>
              <dt>백업</dt>
              <dd>JSON 내보내기와 복원 지원. 복원 직전 데이터는 자동 보관합니다.</dd>
            </div>
            <div>
              <dt>기능 범위</dt>
              <dd>
                로컬 상담 기록·표현 활동·통계·보고서. AI 분석, 음성 인식, 암호화, 기기 간 동기화는
                연결되어 있지 않습니다.
              </dd>
            </div>
          </dl>
        </section>
      )}
    </>
  )
}
