import { AuthBoundary } from './AuthGate'
import { useAuthStore } from './auth'
import { TabIndicator } from '../components/TabIndicator'
import { BrandIcon } from '../components/BrandIcon'
import { Input as TextInput } from '../components/ui/input'
import { FormSelect } from '../components/form-controls'
import { useEffect, useRef, useState } from 'react'
import {
  House,
  FolderOpen,
  Users,
  ChartNoAxesCombined,
  Files,
  Megaphone,
  Settings,
  Plus,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  LockKeyhole,
  ChevronLeft,
  ChevronRight,
  HelpCircle
} from 'lucide-react'
import { WorkspaceProvider, useWorkspace } from './context'
import { HOME_TABS, REPORT_TABS, SETTING_TABS, STAT_TABS, uid } from './model'
import { Button, Modal } from './ui'
import { HomePage } from './Home'
import { CasesPage } from './Cases'
import { StudentsPage } from './Students'
import { StatisticsPage, ReportsPage, SettingsPage, NoticesPage } from './WorkspacePages'

const MENU = [
  { key: 'home', label: '홈', path: '/', icon: House },
  { key: 'cases', label: '사례 관리', path: '/cases', icon: FolderOpen },
  { key: 'students', label: '학생 관리', path: '/students', icon: Users },
  { key: 'statistics', label: '통계', path: '/statistics', icon: ChartNoAxesCombined },
  { key: 'reports', label: '보고서', path: '/reports', icon: Files },
  { key: 'notices', label: '공지사항', path: '/notices', icon: Megaphone },
  { key: 'settings', label: '설정', path: '/settings', icon: Settings }
]
const HOME_IDS = ['today', 'calendar', 'cases', 'stale', 'recent', 'archival', 'art', 'school']
const SETTING_IDS = [
  'general',
  'schools',
  'timetable',
  'security',
  'backup',
  'auto-backup',
  'subscription',
  'documents',
  'attribution'
]
const STATS_IDS = ['summary', 'classification', 'timeline', 'flow'],
  REPORT_IDS = ['excel', 'ledger', 'pdf', 'archival']
function sectionFor(path: string): string {
  return path.split(/[/?#]/)[1] || 'home'
}
function titleFor(path: string): string {
  const section = sectionFor(path)
  if (path.includes('#home-school')) return '학교 생활'
  if (path.includes('#home-art')) return '마음 그리기'
  if (path.includes('/sessions/new')) return '새 상담 기록'
  if (path.includes('/sessions/')) return '상담 상세'
  if (path.includes('/numbers/history')) return '사례번호 변경 이력'
  if (path.includes('/numbers/settings')) return '자동 번호 설정'
  if (path.includes('/numbers')) return '사례번호 정리'
  if (path.includes('/neis-import')) return '나이스 가져오기'
  if (path.startsWith('/cases/new')) return '새 사례'
  if (/^\/cases\/[^?#/]+/.test(path)) return '사례 상세'
  if (/^\/students\/[^?#/]+/.test(path)) return '학생 상세'
  return MENU.find((item) => item.key === section)?.label ?? '홈'
}
interface Tab {
  id: string
  history: string[]
  index: number
}
export default function WeetoryShell(): React.JSX.Element {
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'home-tab', history: ['/'], index: 0 }]),
    [active, setActive] = useState('home-tab')
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0],
    path = current.history[current.index]
  const navigate = (next: string): void => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === active
          ? {
              ...tab,
              history: [...tab.history.slice(0, tab.index + 1), next],
              index: tab.index + 1
            }
          : tab
      )
    )
  }
  const addTab = (): void => {
    const id = uid()
    setTabs((prev) => [...prev, { id, history: ['/'], index: 0 }])
    setActive(id)
  }
  const closeTab = (id: string): void => {
    if (tabs.length === 1) return
    const remaining = tabs.filter((tab) => tab.id !== id)
    setTabs(remaining)
    if (active === id) setActive(remaining[remaining.length - 1].id)
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key === 't') {
        event.preventDefault()
        const id = uid()
        setTabs((prev) => [...prev, { id, history: ['/'], index: 0 }])
        setActive(id)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
  return (
    <WorkspaceProvider path={path} navigate={navigate}>
      <AuthBoundary>
        <ShellBody
          tabs={tabs}
          active={active}
          setActive={setActive}
          addTab={addTab}
          closeTab={closeTab}
          back={() =>
            setTabs((prev) =>
              prev.map((tab) =>
                tab.id === active ? { ...tab, index: Math.max(0, tab.index - 1) } : tab
              )
            )
          }
          forward={() =>
            setTabs((prev) =>
              prev.map((tab) =>
                tab.id === active
                  ? { ...tab, index: Math.min(tab.history.length - 1, tab.index + 1) }
                  : tab
              )
            )
          }
          canBack={current.index > 0}
          canForward={current.index < current.history.length - 1}
        />
      </AuthBoundary>
    </WorkspaceProvider>
  )
}
function ShellBody({
  tabs,
  active,
  setActive,
  addTab,
  closeTab,
  back,
  forward,
  canBack,
  canForward
}: {
  tabs: Tab[]
  active: string
  setActive: (id: string) => void
  addTab: () => void
  closeTab: (id: string) => void
  back: () => void
  forward: () => void
  canBack: boolean
  canForward: boolean
}): React.JSX.Element {
  const { data, setData, path, navigate } = useWorkspace()
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return
    const animation = mainRef.current?.animate([{ opacity: 0.7 }, { opacity: 1 }], {
      duration: 160,
      easing: 'cubic-bezier(0.2, 0, 0, 1)'
    })
    const stop = (): void => {
      if (media.matches) animation?.cancel()
    }
    media.addEventListener('change', stop)
    return () => {
      animation?.cancel()
      media.removeEventListener('change', stop)
    }
  }, [path, data.activeSchoolId])

  const section = sectionFor(path)
  const [collapsed, setCollapsed] = useState(false),
    [query, setQuery] = useState(''),
    [help, setHelp] = useState(false)
  const results = data.students.filter(
    (student) =>
      student.schoolId === data.activeSchoolId &&
      query.trim() &&
      student.name.includes(query.trim())
  )
  let subitems: { label: string; path: string }[] = []
  if (section === 'home')
    subitems = HOME_TABS.map((label, i) => ({ label, path: `/#home-${HOME_IDS[i]}` }))
  if (section === 'cases')
    subitems = [
      { label: '전체 사례', path: '/cases' },
      { label: '진행 중', path: '/cases?status=진행' },
      { label: '종결', path: '/cases?status=종결' },
      { label: '새 사례 등록', path: '/cases/new' },
      { label: '나이스 가져오기', path: '/cases/new/neis-import' },
      { label: '사례번호 정리', path: '/cases/numbers' },
      { label: '자동 번호 설정', path: '/cases/numbers/settings' },
      { label: '사례번호 변경 이력', path: '/cases/numbers/history' }
    ]
  if (section === 'students')
    subitems = [
      { label: '전체 학생', path: '/students' },
      { label: '학생 등록', path: '/students?view=new' },
      { label: '명렬표 가져오기', path: '/students?view=import' },
      { label: '학생 정보 요청', path: '/students?view=request' }
    ]
  if (section === 'statistics')
    subitems = STAT_TABS.map((label, i) => ({ label, path: `/statistics?tab=${STATS_IDS[i]}` }))
  if (section === 'reports')
    subitems = REPORT_TABS.map((label, i) => ({ label, path: `/reports?tab=${REPORT_IDS[i]}` }))
  if (section === 'settings')
    subitems = SETTING_TABS.map((label, i) => ({
      label,
      path: `/settings#settings-${SETTING_IDS[i]}`
    }))
  if (section === 'notices')
    subitems = [
      { label: '공지사항', path: '/notices' },
      { label: '사용 도움말', path: '/notices?tab=help' }
    ]
  const selectedPath =
    path === '/'
      ? '/#home-today'
      : path === '/statistics'
        ? '/statistics?tab=summary'
        : path === '/reports'
          ? '/reports?tab=excel'
          : path === '/settings'
            ? '/settings#settings-general'
            : path
  return (
    <div className={`wt-shell ${collapsed ? 'wt-collapsed' : ''}`}>
      <aside className="wt-rail">
        <button className="wt-logo" aria-label="위토리 홈" onClick={() => navigate('/')}>
          <BrandIcon size={26} />
        </button>
        <nav aria-label="주 메뉴">
          {MENU.map((item, index) => (
            <button
              key={item.key}
              className={`${section === item.key ? 'active' : ''} ${index === 5 ? 'wt-utility' : ''}`}
              aria-label={item.label}
              title={item.label}
              onClick={() => navigate(item.path)}
            >
              <item.icon size={21} strokeWidth={1.65} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="wt-help-button" aria-label="도움말" onClick={() => setHelp(true)}>
          <HelpCircle size={20} />
        </button>
      </aside>
      <aside
        id="workspace-sidebar"
        className="wt-section-panel"
        inert={collapsed}
        aria-hidden={collapsed}
      >
        <div className="wt-school-brand">
          <strong>{data.settings.counselor} 선생님의 상담실</strong>
          <span>{data.settings.schoolYear}학년도 · 전문상담교사</span>
        </div>
        <div className="wt-panel-heading">{MENU.find((item) => item.key === section)?.label}</div>
        <nav aria-label="메뉴별 하위 목록">
          {subitems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={selectedPath === item.path ? 'active' : ''}
            >
              {item.label}
              {item.label === '진행 중' && (
                <span>
                  {
                    data.cases.filter(
                      (row) => row.schoolId === data.activeSchoolId && row.status === '진행'
                    ).length
                  }
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="wt-panel-bottom">
          <BrandIcon size={18} />
          <p>
            아이의 이야기가
            <br />
            차곡차곡 쌓이는 곳
          </p>
          <span>화면 PoC · AI 제외</span>
        </div>
      </aside>
      <div className="wt-workspace">
        <header className="wt-topbar">
          <button
            className="icon-button"
            aria-label={collapsed ? '하위 메뉴 펼치기' : '하위 메뉴 접기'}
            aria-expanded={!collapsed}
            aria-controls="workspace-sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="wt-history">
            <button
              className="icon-button"
              aria-label="이전 화면"
              disabled={!canBack}
              onClick={back}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="다음 화면"
              disabled={!canForward}
              onClick={forward}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="wt-tabbar" role="tablist" aria-label="열린 화면">
            <TabIndicator selector=".wt-tab.active" />
            {tabs.map((tab) => (
              <div className={`wt-tab ${tab.id === active ? 'active' : ''}`} key={tab.id}>
                <button
                  role="tab"
                  aria-selected={tab.id === active}
                  onClick={() => setActive(tab.id)}
                >
                  {titleFor(tab.history[tab.index])}
                </button>
                {tabs.length > 1 && (
                  <button
                    aria-label={`${titleFor(tab.history[tab.index])} 탭 닫기`}
                    onClick={() => closeTab(tab.id)}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button className="icon-button" aria-label="새 탭" onClick={addTab}>
              <Plus size={16} />
            </button>
          </div>
          <FormSelect
            className="wt-school-select"
            aria-label="현재 학교"
            value={data.activeSchoolId}
            onValueChange={(event) => {
              setData((prev) => ({ ...prev, activeSchoolId: event }))
              navigate('/')
            }}
          >
            {data.schools
              .filter((s) => !s.archived)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </FormSelect>
          <Button
            className="max-w-44 truncate"
            title={data.account.email || '로그인'}
            variant="ghost"
            onClick={() => navigate('/settings#settings-subscription')}
          >
            {data.account.logged ? data.account.email : '로그인'}
          </Button>
          <button
            className="icon-button"
            aria-label="화면 잠금"
            onClick={() => useAuthStore.getState().lock()}
          >
            <LockKeyhole size={19} />
          </button>
        </header>
        <div className="wt-contextbar">
          <span>
            나의 상담실 <ChevronRight size={13} />
            {titleFor(path)}
          </span>
          <div className="wt-search">
            <Search size={15} />
            <TextInput
              aria-label="전체 학생 검색"
              placeholder="학생 빠르게 찾기"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <div className="wt-search-results">
                {results.length ? (
                  results.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => {
                        setQuery('')
                        navigate(`/students/${student.id}`)
                      }}
                    >
                      {student.name}
                      <ArrowLabel />
                    </button>
                  ))
                ) : (
                  <p>검색 결과가 없습니다.</p>
                )}
              </div>
            )}
          </div>
        </div>
        <main ref={mainRef} className="wt-main" key={data.activeSchoolId}>
          {section === 'home' && <HomePage />}
          {section === 'cases' && <CasesPage />}
          {section === 'students' && <StudentsPage />}
          {section === 'statistics' && <StatisticsPage />}
          {section === 'reports' && <ReportsPage />}
          {section === 'settings' && <SettingsPage key={data.activeSchoolId} />}
          {section === 'notices' && <NoticesPage />}
        </main>
        <footer className="wt-footer">
          <span>
            <i />
            위토리 화면 PoC
          </span>
          <span>화면의 변경 사항은 이번 실행 동안 유지됩니다.</span>
        </footer>
      </div>
      {help && (
        <Modal title="위토리 화면 살펴보기" onClose={() => setHelp(false)}>
          <div className="wt-stack">
            <p>원본 위토리의 메뉴와 상세 흐름을 확인하는 화면 PoC입니다.</p>
            <p>
              사례를 등록하고 학생을 연결한 뒤 상담 기록을 작성해 보세요. 캘린더에서는 일정을
              드래그해 이동하거나 기간을 늘릴 수 있습니다.
            </p>
            <p>
              입력 내용은 메모리에만 유지됩니다. 계정, 발송, 암호화와 파일 처리는 화면 시연이며 실제
              서비스에 연결되지 않습니다.
            </p>
            <Button
              onClick={() => {
                setHelp(false)
                navigate('/notices?tab=help')
              }}
            >
              사용 도움말 보기
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
function ArrowLabel(): React.JSX.Element {
  return <ChevronRight size={14} />
}
