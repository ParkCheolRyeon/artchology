import { ArtStudio } from './ArtStudio'
import { Palette } from 'lucide-react'
import { Surface } from './ui'

import {
  CalendarPlus,
  Plus,
  ArrowRight,
  Clock3,
  FolderOpen,
  Archive as ArchiveIcon
} from 'lucide-react'
import { useWorkspace } from './context'
import { day } from './model'
import { Button, PageHeading, SectionHeading, Empty, Badge, RowLink } from './ui'
import { CalendarWorkspace } from './Calendar'

export function HomePage(): React.JSX.Element {
  const { data, path, navigate } = useWorkspace()
  const section = path.split('#')[1] ?? 'home-today'
  const sessions = data.sessions.filter((row) => row.schoolId === data.activeSchoolId)
  const cases = data.cases.filter((row) => row.schoolId === data.activeSchoolId)
  const today = day()
  const todayRows = sessions
    .filter(
      (row) =>
        row.start.slice(0, 10) <= today &&
        row.end.slice(0, 10) >= today &&
        (!row.allDay || row.end.slice(0, 10) > today)
    )
    .toSorted((a, b) => a.start.localeCompare(b.start))
  const latest = sessions
    .filter((row) => row.status === '완료')
    .toSorted((a, b) => b.start.localeCompare(a.start))
    .slice(0, 8)
  const active = cases.filter((row) => row.status === '진행')
  const stale = active
    .map((row) => {
      const last = sessions
        .filter((s) => s.caseId === row.id && s.status === '완료')
        .toSorted((a, b) => b.start.localeCompare(a.start))[0]
      return { row, last: last?.start.slice(0, 10) ?? row.createdAt }
    })
    .filter((item) => (new Date(today).getTime() - new Date(item.last).getTime()) / 86400000 >= 14)
  const names = (ids: string[]): string =>
    ids
      .map((id) => data.students.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  const openSession = (id: string, caseId: string): void =>
    navigate(caseId ? `/cases/${caseId}/sessions/${id}` : '/#home-calendar')
  if (section === 'home-art') return <ArtStudio key={data.activeSchoolId} />
  if (section === 'home-calendar')
    return (
      <>
        <PageHeading title="캘린더" subtitle="학생과의 만남, 하루의 일정을 여유 있게 살펴보세요." />
        <CalendarWorkspace />
      </>
    )
  return (
    <>
      <div className="wt-home-heading">
        <span>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}</span>
        <PageHeading
          title={new Date().toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
          subtitle={`오늘 상담 ${todayRows.length}건 · 진행 중 사례 ${active.length}건 · 장기 미접촉 ${stale.length}건`}
        >
          <Button variant="secondary" onClick={() => navigate('/#home-calendar')}>
            <CalendarPlus size={16} />새 상담
          </Button>
          <Button onClick={() => navigate('/cases/new')}>
            <Plus size={16} />새 사례
          </Button>
        </PageHeading>
      </div>
      {section === 'home-today' && (
        <Surface className="wt-art-home mb-6 flex flex-wrap items-center justify-between gap-6 border-blue-100 bg-secondary/50">
          <div className="flex items-center gap-5">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-primary">
              <Palette size={27} />
            </span>
            <div>
              <p className="mb-2 text-xs font-medium text-primary">artbonbon · 마음 그리기</p>
              <h2 className="text-xl font-semibold">말로 다 못한 마음, 그림으로 만나보세요.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                아이의 속도에 맞춰 시작하는 작은 표현 활동
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/#home-art')}>
            드로잉 활동 둘러보기
            <ArrowRight size={16} />
          </Button>
        </Surface>
      )}
      {(section === 'home-today' || section === 'home-cases') && (
        <div className="wt-home-overview">
          <Surface className="surface">
            <SectionHeading
              title="오늘의 상담"
              count={todayRows.length}
              onClick={() => navigate('/#home-calendar')}
              action="캘린더 열기"
            />
            {todayRows.length ? (
              todayRows.map((row) => (
                <button
                  className="wt-agenda-row"
                  key={row.id}
                  onClick={() => openSession(row.id, row.caseId)}
                >
                  <span className="wt-agenda-time">
                    {row.allDay ? '종일' : row.start.slice(11, 16)}
                  </span>
                  <i style={{ background: row.color }} />
                  <span>
                    <strong>{names(row.studentIds) || row.title}</strong>
                    <small>{row.title}</small>
                  </span>
                  <Badge tone={row.status === '완료' ? 'gray' : 'blue'}>{row.status}</Badge>
                  <ArrowRight size={15} />
                </button>
              ))
            ) : (
              <Empty
                title="오늘 예정된 상담이 없습니다"
                action={<Button onClick={() => navigate('/#home-calendar')}>일정 추가</Button>}
              />
            )}
          </Surface>
          <Surface className="surface wt-case-overview">
            <SectionHeading title="사례 현황" onClick={() => navigate('/cases')} />
            <FolderOpen size={26} />
            <p>
              <strong>{active.length}</strong>건 진행 중
            </p>
            <div className="wt-progress">
              <span
                style={{
                  width: `${active.length ? ((active.length - stale.length) / active.length) * 100 : 0}%`
                }}
              />
            </div>
            <div className="wt-muted">
              접촉 유지 {active.length - stale.length} · 장기 미접촉 {stale.length}
            </div>
            <RowLink onClick={() => navigate('/cases?status=종결')}>
              종결 사례 {cases.length - active.length}건
            </RowLink>
          </Surface>
        </div>
      )}
      {section === 'home-today' && <CalendarWorkspace compact />}
      {(section === 'home-today' || section === 'home-stale') && (
        <Surface className="surface wt-section">
          <SectionHeading title="장기 미접촉" count={stale.length} />
          <p className="wt-note">14일 이상 완료된 상담 기록이 없는 진행 중 사례입니다.</p>
          {stale.length ? (
            stale.map(({ row, last }) => (
              <RowLink key={row.id} onClick={() => navigate(`/cases/${row.id}`)}>
                <span>
                  <strong>{names(row.studentIds)}</strong>
                  <small>
                    {row.number} · 마지막 접촉 {last}
                  </small>
                </span>
                <Badge tone="amber">
                  {Math.floor((new Date(today).getTime() - new Date(last).getTime()) / 86400000)}일
                  경과
                </Badge>
              </RowLink>
            ))
          ) : (
            <Empty title="모든 사례를 꾸준히 만나고 있어요" />
          )}
        </Surface>
      )}
      {(section === 'home-today' || section === 'home-recent') && (
        <Surface className="surface wt-section">
          <SectionHeading title="최근 기록" />
          <div className="wt-record-list">
            {latest.map((row) => (
              <RowLink
                className="wt-record-row"
                key={row.id}
                onClick={() => openSession(row.id, row.caseId)}
              >
                <Clock3 size={17} />
                <span>{row.start.slice(0, 10)}</span>
                <strong>{names(row.studentIds)}</strong>
                <span>{row.title}</span>
              </RowLink>
            ))}
          </div>
        </Surface>
      )}
      {section === 'home-archival' && (
        <Surface className="surface wt-section">
          <SectionHeading title="기록물 보관" />
          <ArchiveIcon size={28} />
          <h2>한 해의 상담 기록을 차곡차곡</h2>
          <p className="wt-note">학년도별 상담일지를 편철하고 정본과 이관 상태를 관리합니다.</p>
          <Button onClick={() => navigate('/reports?tab=archival')}>기록물 보관·이관 열기</Button>
        </Surface>
      )}
    </>
  )
}
