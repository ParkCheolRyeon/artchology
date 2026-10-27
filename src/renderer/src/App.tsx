import { errorMessage } from './format'
import { useEffect, useState } from 'react'
import {
  House,
  Users,
  NotebookPen,
  Palette,
  ChartNoAxesCombined,
  Files,
  Settings as SettingsIcon,
  Sprout,
  ChevronRight,
  CircleCheck,
  X,
  Search,
  Plus
} from 'lucide-react'
import {
  APP,
  localDate,
  type Store,
  type Student,
  type Session,
  type Result,
  type ExportKind,
  type ReportFilter
} from '../../shared/model'
import { Dashboard } from './pages/Dashboard'
import { Students, StudentDetail, Sessions } from './pages/Students'
import { RecordDetail } from './pages/RecordDetail'
import { ArtStudio } from './pages/ArtStudio'
import { Statistics, Reports, SettingsPage } from './pages/Workspace'
import { StudentForm, SessionForm } from './components/Forms'
import { Button, Empty } from './components/ui'

type Page = 'home' | 'students' | 'sessions' | 'art' | 'statistics' | 'reports' | 'settings'
const NAV = [
  { id: 'home', label: '홈', icon: House },
  { id: 'students', label: '학생 관리', icon: Users },
  { id: 'sessions', label: '상담 기록', icon: NotebookPen },
  { id: 'art', label: '마음 그리기', icon: Palette },
  { id: 'statistics', label: '통계', icon: ChartNoAxesCombined },
  { id: 'reports', label: '보고서', icon: Files }
] as const
export default function App(): React.JSX.Element {
  const [data, setData] = useState<Store | null>(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState<Page>('home')
  const [studentId, setStudentId] = useState<string | null>(null)
  const [artDirty, setArtDirty] = useState(false)
  const [artBusy, setArtBusy] = useState(false)
  const [artStudent, setArtStudent] = useState<string | undefined>()
  const [studentForm, setStudentForm] = useState<Student | 'new' | null>(null)
  const [sessionForm, setSessionForm] = useState<Session | 'new' | null>(null)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [sessionStudentId, setSessionStudentId] = useState<string | undefined>()
  const [scheduledDate, setScheduledDate] = useState<string | undefined>()
  const [notice, setNotice] = useState('')
  const [quickSearch, setQuickSearch] = useState('')
  async function load(): Promise<void> {
    try {
      const result = await window.api.load()
      if (!result.ok) throw new Error(result.error)
      setData(result.data)
      setError('')
    } catch (error) {
      setError(errorMessage(error))
    }
  }
  useEffect(() => {
    let active = true
    window.api
      .load()
      .then((result) => {
        if (!active) return
        if (result.ok) setData(result.data)
        else setError(result.error)
      })
      .catch((error: unknown) => {
        if (active) setError(errorMessage(error))
      })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])
  function allowNavigation(): boolean {
    if (artBusy) {
      setNotice('그림을 저장하고 있어요. 잠시만 기다려 주세요.')
      return false
    }
    if (artDirty && !window.confirm('저장하지 않은 그림이 있어요. 다른 화면으로 이동할까요?'))
      return false
    setArtDirty(false)
    return true
  }
  function navigate(next: Page): void {
    if (!allowNavigation()) return
    setRecordId(null)
    setPage(next)
    setStudentId(null)
    setQuickSearch('')
    setArtStudent(undefined)
  }
  function openStudent(student: Student): void {
    if (!allowNavigation()) return
    setRecordId(null)
    setStudentId(student.id)
    setPage('students')
    setQuickSearch('')
  }
  async function save(operation: Promise<Result<Store>>, message: string): Promise<void> {
    const result = await operation
    if (!result.ok) throw new Error(result.error)
    setData(result.data)
    setNotice(message)
  }
  function openRecord(session: Session): void {
    setRecordId(session.id)
  }
  async function exportFile(kind: ExportKind, filter?: ReportFilter): Promise<void> {
    const result = await window.api.exportFile(kind, filter)
    if (!result.ok) throw new Error(result.error)
    if (result.data) setNotice('파일을 저장했습니다.')
  }
  const record = data?.sessions.find((row) => row.id === recordId)
  const student = data?.students.find((row) => row.id === studentId)
  const results = quickSearch.trim()
    ? (data?.students.filter((row) => row.name.includes(quickSearch.trim())) ?? [])
    : []
  const label = page === 'settings' ? '설정' : NAV.find((item) => item.id === page)?.label
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('home')}>
          <span className="brand-symbol">
            <Sprout size={25} strokeWidth={1.7} />
          </span>
          <span>
            artchology<small>아이의 마음을 잇는 기록</small>
          </span>
        </button>
        <div className="school-block">
          <span className="school-icon">
            <House size={17} />
          </span>
          <div>
            <strong>{data?.settings.school ?? '상담 공간'}</strong>
            <span>상담실</span>
          </div>
          <span className="school-year">{new Date().getFullYear()}</span>
        </div>
        <nav aria-label="주 메뉴">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''} ${item.id === 'statistics' ? 'nav-separated' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={19} strokeWidth={1.7} />
              <span>{item.label}</span>
              {item.id === 'art' && <span className="nav-art-dot" />}
              {page === item.id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-message">
            <Sprout size={18} />
            <p>
              작은 기록이 모여
              <br />
              아이의 내일을 바꿉니다.
            </p>
          </div>
          <button
            className={`nav-item ${page === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <SettingsIcon size={19} />
            <span>설정</span>
          </button>
          <div className="sidebar-user">
            <span>{data?.settings.counselor.slice(0, 1) ?? '선'}</span>
            <div>
              <strong>{data?.settings.counselor ?? '선생님'}</strong>
              <small>전문상담교사</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            나의 상담실
            <ChevronRight size={14} />
            <button className="breadcrumb-link" onClick={() => navigate(page)}>
              {label}
            </button>
            {student && (
              <>
                <ChevronRight size={14} />
                <button className="breadcrumb-link" onClick={() => setRecordId(null)}>
                  {student.name}
                </button>
              </>
            )}
            {record && (
              <>
                <ChevronRight size={14} />
                <strong>{record.title}</strong>
              </>
            )}
          </div>
          <div className="topbar-actions">
            <div className="global-search">
              <Search size={16} />
              <input
                aria-label="전체 학생 검색"
                placeholder="학생 빠르게 찾기"
                value={quickSearch}
                onChange={(event) => setQuickSearch(event.target.value)}
              />
              {quickSearch && (
                <button aria-label="빠른 검색 닫기" onClick={() => setQuickSearch('')}>
                  <X size={14} />
                </button>
              )}
              {quickSearch && (
                <div className="search-results">
                  {results.length ? (
                    results.map((student) => (
                      <button key={student.id} onClick={() => openStudent(student)}>
                        {student.name}
                        <span>
                          {student.grade}학년 {student.classroom}반
                        </span>
                      </button>
                    ))
                  ) : (
                    <p>검색 결과가 없습니다.</p>
                  )}
                </div>
              )}
            </div>
            <span className="demo-badge">시연 모드</span>
          </div>
        </header>
        <main className="main-content" key={page}>
          {error ? (
            <Empty
              title="데이터를 불러오지 못했어요"
              description={error}
              action={<Button onClick={() => void load()}>다시 시도</Button>}
            />
          ) : !data ? (
            <div className="loading" role="status">
              <Sprout size={28} />
              <p>상담 공간을 준비하고 있어요.</p>
            </div>
          ) : (
            <>
              {record && (
                <RecordDetail
                  key={record.id}
                  data={data}
                  session={record}
                  back={() => setRecordId(null)}
                  edit={() => setSessionForm(record)}
                  openStudent={openStudent}
                  openSession={openRecord}
                  add={(id) => {
                    setSessionStudentId(id)
                    setScheduledDate(localDate())
                    setSessionForm('new')
                  }}
                />
              )}
              <div hidden={Boolean(record)}>
                {page === 'home' && (
                  <Dashboard
                    data={data}
                    openStudent={openStudent}
                    openSession={openRecord}
                    newSession={() => {
                      setSessionStudentId(undefined)
                      setScheduledDate(undefined)
                      setSessionForm('new')
                    }}
                    scheduleSession={(date) => {
                      setSessionStudentId(undefined)
                      setScheduledDate(date)
                      setSessionForm('new')
                    }}
                    goStudents={() => navigate('students')}
                    goSessions={() => navigate('sessions')}
                    goArt={() => navigate('art')}
                  />
                )}
                {page === 'students' && (
                  <>
                    <div hidden={Boolean(student)}>
                      <Students data={data} open={openStudent} add={() => setStudentForm('new')} />
                    </div>
                    {student && (
                      <StudentDetail
                        key={student.id}
                        student={student}
                        data={data}
                        back={() => setStudentId(null)}
                        edit={() => setStudentForm(student)}
                        record={() => {
                          setSessionStudentId(undefined)
                          setScheduledDate(undefined)
                          setSessionForm('new')
                        }}
                        openSession={openRecord}
                        art={() => {
                          setArtStudent(student.id)
                          setPage('art')
                        }}
                      />
                    )}
                  </>
                )}
                {page === 'sessions' && (
                  <Sessions
                    data={data}
                    add={() => {
                      setSessionStudentId(undefined)
                      setScheduledDate(undefined)
                      setSessionForm('new')
                    }}
                    open={openRecord}
                  />
                )}
                {page === 'art' && (
                  <ArtStudio
                    data={data}
                    initialStudent={artStudent}
                    onDirtyChange={setArtDirty}
                    onBusyChange={setArtBusy}
                    save={(input) =>
                      save(window.api.saveDrawing(input), '마음 그림을 저장했습니다.')
                    }
                    done={(id) => {
                      setArtDirty(false)
                      setArtBusy(false)
                      setStudentId(id)
                      setPage('students')
                    }}
                  />
                )}
                {page === 'statistics' && (
                  <Statistics data={data} openSession={openRecord} openStudent={openStudent} />
                )}
                {page === 'reports' && (
                  <Reports data={data} exportFile={exportFile} openSession={openRecord} />
                )}
                {page === 'settings' && (
                  <SettingsPage
                    data={data}
                    exportFile={exportFile}
                    restore={() => save(window.api.restoreBackup(), '백업 데이터를 복원했습니다.')}
                    settings={data.settings}
                    save={(input) =>
                      save(window.api.saveSettings(input), '기본 정보를 저장했습니다.')
                    }
                  />
                )}
              </div>
            </>
          )}
        </main>
        <footer className="workspace-footer">
          <span>
            <span className="save-dot" />이 컴퓨터에 저장되는 나의 상담 공간
          </span>
          <span>{APP.name} · Prototype</span>
        </footer>
      </div>
      {studentForm && (
        <StudentForm
          student={studentForm === 'new' ? undefined : studentForm}
          onClose={() => setStudentForm(null)}
          onSave={(input) => save(window.api.saveStudent(input), '학생 정보를 저장했습니다.')}
        />
      )}
      {sessionForm &&
        data &&
        (data.students.length ? (
          <SessionForm
            students={data.students}
            session={sessionForm === 'new' ? undefined : sessionForm}
            studentId={sessionStudentId ?? studentId ?? undefined}
            scheduledDate={scheduledDate}
            onClose={() => {
              setSessionForm(null)
              setSessionStudentId(undefined)
              setScheduledDate(undefined)
            }}
            onSave={(input) => save(window.api.saveSession(input), '상담 기록을 저장했습니다.')}
          />
        ) : (
          <div className="toast" role="alert">
            학생을 먼저 등록해 주세요.
            <button
              onClick={() => {
                setSessionForm(null)
                setStudentForm('new')
              }}
            >
              <Plus size={16} />
              학생 등록
            </button>
            <button aria-label="알림 닫기" onClick={() => setSessionForm(null)}>
              <X size={16} />
            </button>
          </div>
        ))}
      {notice && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          {notice}
          <button aria-label="알림 닫기" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
