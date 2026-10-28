import { Surface } from './ui'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../components/ui/table'
import { Input as TextInput } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { FormSelect, FormCheckbox, DateInput } from '../components/form-controls'
import { useState, type ReactNode } from 'react'
import { useWorkspace } from './context'
import {
  CATEGORIES,
  REPORT_TABS,
  STAT_TABS,
  SETTING_TABS,
  day,
  uid,
  type Archive,
  type School,
  type WorkspaceData
} from './model'
import { Button, Field, Modal, Empty, PageHeading, Tabs, Badge, DemoNotice } from './ui'

const reportKeys = ['excel', 'ledger', 'pdf', 'archival'],
  statKeys = ['summary', 'classification', 'timeline', 'flow'],
  settingKeys = [
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
function Panel({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <Surface className="surface wt-panel">
      <h2>{title}</h2>
      {children}
    </Surface>
  )
}
function Actions({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="form-actions">{children}</div>
}
function countBy(values: string[]): [string, number][] {
  const counts = new Map<string, number>()
  values.forEach((v) => counts.set(v || '미기재', (counts.get(v || '미기재') || 0) + 1))
  return [...counts].sort((a, b) => b[1] - a[1])
}
function Bars({
  title,
  rows,
  onClick
}: {
  title: string
  rows: [string, number][]
  onClick?: (key: string) => void
}): React.JSX.Element {
  return (
    <Panel title={title}>
      {rows.length ? (
        rows.map(([label, count]) => (
          <button
            type="button"
            className="wt-stat-row"
            key={label}
            onClick={() => onClick?.(label)}
          >
            <span>{label}</span>
            <span className="wt-bar-track">
              <i style={{ width: `${(count / Math.max(...rows.map((r) => r[1]))) * 100}%` }} />
            </span>
            <strong>{count}건</strong>
          </button>
        ))
      ) : (
        <Empty title="조회된 데이터가 없습니다." />
      )}
    </Panel>
  )
}
function useReportFilter(): {
  sessions: WorkspaceData['sessions']
  filter: React.JSX.Element
  from: string
  to: string
} {
  const { data } = useWorkspace()
  const [from, setFrom] = useState(`${data.settings.schoolYear}-01-01`),
    [to, setTo] = useState(`${data.settings.schoolYear}-12-31`),
    [student, setStudent] = useState(''),
    [type, setType] = useState('')
  const sessions = data.sessions.filter(
    (s) =>
      s.schoolId === data.activeSchoolId &&
      s.status === '완료' &&
      s.start.slice(0, 10) >= from &&
      s.start.slice(0, 10) <= to &&
      (!student || s.studentIds.includes(student)) &&
      (!type || s.category === type)
  )
  const filter = (
    <div className="form-grid wt-filter-grid">
      <Field label="시작일">
        <DateInput type="date" value={from} onValueChange={(e) => setFrom(e)} />
      </Field>
      <Field label="종료일">
        <DateInput type="date" value={to} onValueChange={(e) => setTo(e)} />
      </Field>
      <Field label="학생">
        <FormSelect value={student} onValueChange={(e) => setStudent(e)}>
          <option value="">전체 학생</option>
          {data.students
            .filter((s) => s.schoolId === data.activeSchoolId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </FormSelect>
      </Field>
      <Field label="상담 유형">
        <FormSelect value={type} onValueChange={(e) => setType(e)}>
          <option value="">전체 유형</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </FormSelect>
      </Field>
      {from > to && <p role="alert">시작일이 종료일보다 늦습니다.</p>}
    </div>
  )
  return { sessions, filter, from, to }
}
function SessionTable({ sessions }: { sessions: WorkspaceData['sessions'] }): React.JSX.Element {
  const { data, navigate } = useWorkspace()
  return sessions.length ? (
    <div className="table-wrap">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>상담일</TableHead>
            <TableHead>학생</TableHead>
            <TableHead>상담제목</TableHead>
            <TableHead>분류</TableHead>
            <TableHead>매체</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.start.slice(0, 10)}</TableCell>
              <TableCell>
                {s.studentIds.map((id) => data.students.find((p) => p.id === id)?.name).join(', ')}
              </TableCell>
              <TableCell>
                <button className="text-link" onClick={() => navigate(`/sessions/${s.id}`)}>
                  {s.neisTitle || s.title}
                </button>
              </TableCell>
              <TableCell>{s.category}</TableCell>
              <TableCell>{s.medium}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ) : (
    <Empty title="조건에 맞는 상담 기록이 없습니다." />
  )
}
export function StatisticsPage(): React.JSX.Element {
  const { data, path, navigate } = useWorkspace(),
    { sessions, filter } = useReportFilter()
  const key = new URLSearchParams(path.split('?')[1]).get('tab') || 'summary',
    tab = statKeys.includes(key) ? key : 'summary'
  const [preview, setPreview] = useState(false),
    [drill, setDrill] = useState('')
  const cases = data.cases.filter(
    (c) => c.schoolId === data.activeSchoolId && c.year === data.settings.schoolYear
  )
  const minutes = sessions.reduce(
    (n, s) => n + Math.max(0, (new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000),
    0
  )
  return (
    <>
      <PageHeading title="통계" subtitle="상담의 흐름과 변화를 한눈에 살펴보세요.">
        <Button variant="secondary" onClick={() => setPreview(true)}>
          통계 보고서 미리보기
        </Button>
      </PageHeading>
      <Tabs
        items={STAT_TABS}
        value={STAT_TABS[statKeys.indexOf(tab)]}
        onChange={(v) =>
          navigate(
            `/statistics?tab=${statKeys[STAT_TABS.indexOf(v as (typeof STAT_TABS)[number])]}`
          )
        }
      />
      <Panel title={`${data.settings.schoolYear}학년도 상담 통계`}>{filter}</Panel>
      {tab === 'summary' && (
        <div className="my-5 grid grid-cols-5 gap-4 max-[1280px]:grid-cols-3 max-[1000px]:grid-cols-2">
          {[
            ['총 상담 건수', `${sessions.length}건`],
            ['총 상담 시간', `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`],
            ['총 사례 수', `${cases.length}건`],
            [
              '회당 평균 상담 시간',
              `${sessions.length ? Math.round(minutes / sessions.length) : 0}분`
            ],
            [
              '종결율',
              `${cases.length ? Math.round((cases.filter((c) => c.status === '종결').length / cases.length) * 100) : 0}%`
            ]
          ].map(([label, value]) => (
            <Surface key={label} className="p-5">
              <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
              <strong className="my-3 block text-[24px] font-semibold leading-tight tracking-tight tabular-nums">
                {value}
              </strong>
              <p className="text-[11px] text-muted-foreground">선택한 학년도 · 현재 학교</p>
            </Surface>
          ))}
        </div>
      )}
      {tab === 'classification' && (
        <div className="wt-two-cols">
          {[
            ['대분류별', sessions.map((s) => s.category)],
            ['중분류별', sessions.map((s) => s.categoryMedium)],
            ['소분류별', sessions.map((s) => s.categoryDetail)],
            ['매체별', sessions.map((s) => s.medium)],
            [
              '학년별',
              sessions.map(
                (s) =>
                  `${data.students.find((p) => p.id === s.studentIds[0])?.enrollments.find((e) => e.year === data.settings.schoolYear)?.grade || '미기재'}학년`
              )
            ]
          ].map(([title, values]) => (
            <Bars
              key={title as string}
              title={title as string}
              rows={countBy(values as string[])}
              onClick={setDrill}
            />
          ))}
        </div>
      )}
      {tab === 'timeline' && (
        <div className="wt-two-cols">
          <Bars
            title="월별 상담 건수"
            rows={countBy(sessions.map((s) => s.start.slice(0, 7)))}
            onClick={setDrill}
          />
          <Bars title="월별 신규 사례" rows={countBy(cases.map((c) => c.createdAt.slice(0, 7)))} />
          <Bars
            title="요일별 상담 건수"
            rows={countBy(
              sessions.map(
                (s) =>
                  ['일', '월', '화', '수', '목', '금', '토'][new Date(s.start).getDay()] + '요일'
              )
            )}
          />
        </div>
      )}
      {tab === 'flow' && (
        <div className="wt-two-cols">
          <Bars title="의뢰자 유형별" rows={countBy(cases.map((c) => c.referrerRole))} />
          <Bars
            title="종결 사유별"
            rows={countBy(cases.filter((c) => c.status === '종결').map((c) => c.closeReason))}
          />
          <Bars
            title="사례당 상담 횟수 구간"
            rows={countBy(
              cases.map((c) => {
                const n = sessions.filter((s) => s.caseId === c.id).length
                return n === 0
                  ? '0회'
                  : n === 1
                    ? '1회'
                    : n <= 5
                      ? '2~5회'
                      : n <= 10
                        ? '6~10회'
                        : '11회 이상'
              })
            )}
          />
        </div>
      )}
      {preview && (
        <PrintPreview title="상담 통계 보고서" onClose={() => setPreview(false)}>
          <p>
            {data.settings.schoolYear}학년도 ·{' '}
            {data.schools.find((s) => s.id === data.activeSchoolId)?.name}
          </p>
          <p>
            상담 {sessions.length}건 · {minutes}분 · 사례 {cases.length}건
          </p>
          <Bars title="상담 분류" rows={countBy(sessions.map((s) => s.category))} />
          <SessionTable sessions={sessions} />
        </PrintPreview>
      )}
      {drill && (
        <Modal title={`${drill} 상담 기록`} onClose={() => setDrill('')}>
          <SessionTable
            sessions={sessions.filter((s) =>
              [
                s.category,
                s.categoryMedium,
                s.categoryDetail,
                s.medium,
                s.start.slice(0, 7),
                `${data.students.find((p) => p.id === s.studentIds[0])?.enrollments.find((e) => e.year === data.settings.schoolYear)?.grade}학년`
              ].includes(drill)
            )}
          />
        </Modal>
      )}
    </>
  )
}
function PrintPreview({
  title,
  children,
  onClose
}: {
  title: string
  children: ReactNode
  onClose: () => void
}): React.JSX.Element {
  const { notify } = useWorkspace()
  const [size, setSize] = useState('A4'),
    [orientation, setOrientation] = useState('세로'),
    [pages, setPages] = useState('1')
  return (
    <Modal
      title={title}
      subtitle="화면 미리보기 · 실제 PDF 및 파일 저장은 후속 연동 단계에서 제공됩니다."
      onClose={onClose}
    >
      <div className="form-grid">
        <Field label="용지">
          <FormSelect value={size} onValueChange={(e) => setSize(e)}>
            {['A4', 'A3', 'Letter'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </FormSelect>
        </Field>
        <Field label="방향">
          <FormSelect value={orientation} onValueChange={(e) => setOrientation(e)}>
            <option>세로</option>
            <option>가로</option>
          </FormSelect>
        </Field>
        <Field label="한 장에 출력할 쪽">
          <FormSelect value={pages} onValueChange={(e) => setPages(e)}>
            <option>1</option>
            <option>2</option>
          </FormSelect>
        </Field>
      </div>
      <article
        className="wt-document"
        style={{ maxWidth: orientation === '가로' ? '100%' : 680, margin: '20px auto' }}
      >
        {children}
      </article>
      <Actions>
        <Button variant="secondary" onClick={onClose}>
          닫기
        </Button>
        <Button
          onClick={() =>
            notify(
              `${size} ${orientation} · ${pages}쪽 모아찍기 미리보기 설정을 확인했습니다. 실제 파일은 생성하지 않습니다.`
            )
          }
        >
          출력 설정 확인
        </Button>
      </Actions>
    </Modal>
  )
}
export function ReportsPage(): React.JSX.Element {
  const { data, path, navigate, notify } = useWorkspace(),
    { sessions, filter, from, to } = useReportFilter()
  const key = new URLSearchParams(path.split('?')[1]).get('tab') || 'excel',
    tab = reportKeys.includes(key) ? key : 'excel'
  const [preview, setPreview] = useState(''),
    [sheet, setSheet] = useState('상담실적'),
    [month, setMonth] = useState(day().slice(0, 7)),
    [related, setRelated] = useState(''),
    [report, setReport] = useState(''),
    [history, setHistory] = useState<string[]>([]),
    [future, setFuture] = useState<string[]>([]),
    [regen, setRegen] = useState(false)
  const ledger = data.sessions.filter(
    (s) => s.schoolId === data.activeSchoolId && s.status === '완료' && s.start.startsWith(month)
  )
  const title = `${month.replace('-', '년 ')}월 상담관리대장`,
    body = `1. 관련: ${related || '학교 상담 운영계획'}\n2. ${title}을 붙임과 같이 보고합니다.\n붙임 상담관리대장 1부. 끝.`
  function generate(): void {
    setHistory((h) => [...h, report])
    setFuture([])
    setReport(
      `상담 활동 보고서\n\n기간: ${from} ~ ${to}\n학교: ${data.schools.find((s) => s.id === data.activeSchoolId)?.name}\n담당자: ${data.settings.counselor}\n\n1. 상담 운영 현황\n총 ${sessions.length}건의 상담을 진행했습니다.\n\n2. 상담 유형별 실적\n${countBy(
        sessions.map((s) => s.category)
      )
        .map(([k, n]) => `${k}: ${n}건`)
        .join(
          '\n'
        )}\n\n3. 주요 활동 및 성과\n상담 과정에서 확인한 변화와 성과를 작성해 주세요.\n\n4. 향후 지원 계획\n추가 지원과 연계 계획을 작성해 주세요.`
    )
    setRegen(false)
  }
  async function copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      notify('복사했습니다.')
    } catch {
      notify('클립보드를 사용할 수 없습니다. 문구를 선택해 복사해 주세요.')
    }
  }
  return (
    <>
      <PageHeading title="보고서" subtitle="기록을 정리하고 필요한 문서를 준비하세요." />
      <Tabs
        items={REPORT_TABS}
        value={REPORT_TABS[reportKeys.indexOf(tab)]}
        onChange={(v) =>
          navigate(
            `/reports?tab=${reportKeys[REPORT_TABS.indexOf(v as (typeof REPORT_TABS)[number])]}`
          )
        }
      />
      {tab === 'excel' && (
        <>
          <Panel title="나이스 엑셀 내보내기">
            <p>상담제목·상담내용·분류·일자 등 업로드용 항목을 확인합니다.</p>
            {filter}
            <Field label="워크시트">
              <FormSelect value={sheet} onValueChange={(e) => setSheet(e)}>
                <option>상담실적</option>
                <option>개인상담</option>
                <option>집단상담</option>
                <option>교육·자문</option>
              </FormSelect>
            </Field>
            <Actions>
              <span>{sessions.length}건 선택</span>
              <Button
                disabled={!sessions.length || from > to}
                onClick={() => setPreview('나이스 엑셀 미리보기')}
              >
                내보내기 미리보기
              </Button>
            </Actions>
          </Panel>
          <SessionTable sessions={sessions} />
        </>
      )}
      {tab === 'ledger' && (
        <>
          <Panel title="월별 상담관리대장">
            <p>
              현재 학교의 선택한 달 기록을 모아 확인합니다. 상담 목표는 현재 사례 정보를 사용합니다.
            </p>
            <Field label="대상 월">
              <TextInput type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </Field>
            <p>{ledger.length}건</p>
            <Button disabled={!ledger.length} onClick={() => setPreview('상담관리대장 미리보기')}>
              XLSX 구성 미리보기
            </Button>
          </Panel>
          <Panel title="내부결재 기안 문구">
            <Field label="관련 문서 (선택)">
              <TextInput
                value={related}
                onChange={(e) => setRelated(e.target.value)}
                placeholder="OO초등학교-1234(2026. 3. 5.)"
              />
            </Field>
            <Field label="내부결재 제목">
              <TextInput value={title} readOnly />
            </Field>
            <Button variant="ghost" onClick={() => void copy(title)}>
              제목 복사
            </Button>
            <Field label="내부결재 본문">
              <Textarea rows={5} value={body} readOnly />
            </Field>
            <Button variant="ghost" onClick={() => void copy(body)}>
              본문 복사
            </Button>
            <p className="wt-note">
              기안 본문에는 개인정보를 넣지 않고 대장을 붙임으로 첨부합니다. 소속 기관의 보존기간과
              열람 제한을 확인하세요.
            </p>
          </Panel>
        </>
      )}
      {tab === 'pdf' && (
        <>
          <Panel title="관리자 보고서">
            {filter}
            <Actions>
              <Button onClick={() => (report ? setRegen(true) : generate())}>
                보고서 자동 생성
              </Button>
              <Button
                variant="secondary"
                disabled={!report}
                onClick={() => setPreview('관리자 보고서 미리보기')}
              >
                PDF 미리보기
              </Button>
            </Actions>
          </Panel>
          {report && (
            <Panel title="보고서 내용 편집">
              <Actions>
                <Button
                  variant="ghost"
                  disabled={!history.length}
                  onClick={() => {
                    setFuture((f) => [...f, report])
                    setReport(history[history.length - 1])
                    setHistory((h) => h.slice(0, -1))
                  }}
                >
                  실행 취소
                </Button>
                <Button
                  variant="ghost"
                  disabled={!future.length}
                  onClick={() => {
                    setHistory((h) => [...h, report])
                    setReport(future[future.length - 1])
                    setFuture((f) => f.slice(0, -1))
                  }}
                >
                  다시 실행
                </Button>
              </Actions>
              <Textarea
                className="wt-report-editor"
                aria-label="보고서 내용"
                rows={20}
                value={report}
                onChange={(e) => {
                  setHistory((h) => [...h, report])
                  setFuture([])
                  setReport(e.target.value)
                }}
              />
            </Panel>
          )}
        </>
      )}
      {tab === 'archival' && <ArchivalWorkspace />}
      {regen && (
        <Modal title="보고서를 다시 생성하시겠습니까?" onClose={() => setRegen(false)}>
          <p>지금 편집한 내용이 새 집계로 바뀝니다. 실행 취소로 되돌릴 수 있습니다.</p>
          <Actions>
            <Button variant="secondary" onClick={() => setRegen(false)}>
              취소
            </Button>
            <Button onClick={generate}>다시 생성</Button>
          </Actions>
        </Modal>
      )}
      {preview && (
        <PrintPreview title={preview} onClose={() => setPreview('')}>
          {tab === 'pdf' ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{report}</div>
          ) : (
            <>
              <h3>{tab === 'ledger' ? title : sheet}</h3>
              <SessionTable sessions={tab === 'ledger' ? ledger : sessions} />
              {tab === 'ledger' &&
                ledger.map((s) => (
                  <p key={s.id}>
                    {s.start.slice(0, 10)} · 조치계획:{' '}
                    {data.cases.find((c) => c.id === s.caseId)?.goal || '미입력'}
                  </p>
                ))}
            </>
          )}
        </PrintPreview>
      )}
    </>
  )
}
function ArchivalWorkspace(): React.JSX.Element {
  const { data, setData, notify } = useWorkspace()
  const [tab, setTab] = useState('이관 패키지'),
    [selected, setSelected] = useState<string[]>([]),
    [detail, setDetail] = useState<Archive | null>(null),
    [create, setCreate] = useState(false),
    [title, setTitle] = useState(`${data.settings.schoolYear}학년도 상담일지`),
    [year, setYear] = useState(data.settings.schoolYear),
    [preview, setPreview] = useState(''),
    [internal, setInternal] = useState(false),
    [confirm, setConfirm] = useState('')
  const archives = data.archives.filter((a) => a.schoolId === data.activeSchoolId)
  function update(a: Archive): void {
    setData((d) => ({ ...d, archives: d.archives.map((x) => (x.id === a.id ? a : x)) }))
    setDetail(a)
  }
  return (
    <>
      <Tabs items={['이관 패키지', '개별 생성·상태', '절차 안내']} value={tab} onChange={setTab} />
      {tab === '절차 안내' ? (
        <Panel title="선생님은 무엇을 하면 되나요?">
          <ol>
            <li>학년도별 상담일지를 정리하고 기록물철을 생성합니다.</li>
            <li>정본 PDF를 확인하고 K-에듀파인에 생산등록합니다.</li>
            <li>정본 PDF·무결성 목록·이관목록을 하나의 패키지로 준비합니다.</li>
            <li>행정실 또는 교육지원청 기록관과 인계 후 이관 완료로 표시합니다.</li>
          </ol>
          <p>
            보존기간·이관기한은 소속 기관 지침을 확인하세요. 이 화면에서는 실제 문서 등록이나 이관이
            이루어지지 않습니다.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title={tab === '이관 패키지' ? '학년도별 기록물철' : '기록물철 관리'}>
            <Actions>
              <Button onClick={() => setCreate(true)}>기록물철 생성</Button>
              <Button
                variant="secondary"
                disabled={!selected.length}
                onClick={() => setConfirm('package')}
              >
                선택한 철 패키지 생성
              </Button>
              <Button variant="ghost" onClick={() => setPreview('보유목록')}>
                보유목록 엑셀
              </Button>
              <Button variant="ghost" onClick={() => setPreview('이관목록')}>
                이관목록 엑셀
              </Button>
            </Actions>
            <label>
              <FormCheckbox checked={internal} onCheckedChange={(e) => setInternal(e)} /> 정본 PDF에
              상담 기록(비고) 포함
            </label>
            {archives.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <FormCheckbox
                        aria-label="전체 선택"

                        checked={!!archives.length && selected.length === archives.length}
                        onCheckedChange={(e) => setSelected(e ? archives.map((a) => a.id) : [])}
                      />
                    </TableHead>
                    <TableHead>기록물철</TableHead>
                    <TableHead>학년도</TableHead>
                    <TableHead>상태</TableHead>
                    <th />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archives.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <FormCheckbox
                          aria-label={`${a.title} 선택`}

                          checked={selected.includes(a.id)}
                          onCheckedChange={(e) =>
                            setSelected((s) => (e ? [...s, a.id] : s.filter((id) => id !== a.id)))
                          }
                        />
                      </TableCell>
                      <TableCell>{a.title}</TableCell>
                      <TableCell>{a.year}</TableCell>
                      <TableCell>
                        <Badge tone={a.state === '이관 완료' ? 'green' : 'blue'}>{a.state}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" onClick={() => setDetail({ ...a })}>
                          상세 보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Empty
                title="아직 생성한 기록물철이 없습니다."
                description="상담 기록을 학년도별로 모아 첫 기록물철을 만들어 보세요."
              />
            )}
          </Panel>
        </>
      )}
      {create && (
        <Modal title="기록물철 생성" onClose={() => setCreate(false)}>
          <Field label="제목">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="학년도">
            <TextInput
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </Field>
          <p>현재 학교의 해당 학년도 기록을 모읍니다.</p>
          <Actions>
            <Button variant="secondary" onClick={() => setCreate(false)}>
              취소
            </Button>
            <Button
              disabled={!title.trim() || year < 2000}
              onClick={() => {
                const archive: Archive = {
                  id: uid(),
                  schoolId: data.activeSchoolId,
                  year,
                  title,
                  state: '작성 중',
                  recipient: '',
                  date: '',
                  memo: ''
                }
                setData((d) => ({ ...d, archives: [...d.archives, archive] }))
                setCreate(false)
                setDetail(archive)
                notify('기록물철을 화면에 추가했습니다.')
              }}
            >
              생성
            </Button>
          </Actions>
        </Modal>
      )}
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)}>
          <Badge>{detail.state}</Badge>
          <p>{detail.year}학년도 · 보존기간 10년 (소속 기관 확인 필요)</p>
          <SessionTable
            sessions={data.sessions.filter(
              (s) =>
                s.schoolId === data.activeSchoolId &&
                s.start.startsWith(String(detail.year)) &&
                s.status === '완료'
            )}
          />
          <Field label="이관처">
            <TextInput
              value={detail.recipient}
              onChange={(e) => setDetail({ ...detail, recipient: e.target.value })}
              placeholder="학교 행정실 / 교육지원청 기록관"
            />
          </Field>
          <Field label="이관일">
            <DateInput
              type="date"
              value={detail.date}
              onValueChange={(e) => setDetail({ ...detail, date: e })}
            />
          </Field>
          <Field label="비고">
            <Textarea
              value={detail.memo}
              onChange={(e) => setDetail({ ...detail, memo: e.target.value })}
            />
          </Field>
          <Actions>
            <Button
              variant="secondary"
              onClick={() => {
                update(detail)
                notify('기록물철 정보를 저장했습니다.')
              }}
            >
              정보 저장
            </Button>
            <Button variant="secondary" onClick={() => setPreview('정본 PDF')}>
              정본 미리보기
            </Button>
            {detail.state === '작성 중' ? (
              <Button onClick={() => setConfirm('finalize')}>확정</Button>
            ) : (
              <Button
                disabled={!detail.recipient || !detail.date || detail.state === '이관 완료'}
                onClick={() => setConfirm('transfer')}
              >
                이관 완료 처리
              </Button>
            )}
          </Actions>
          <Panel title="K-에듀파인 생산등록 정보">
            <p>생산 · 상담일지관리 · {detail.title} · 비공개 · 직원 열람제한</p>
            <Button
              variant="ghost"
              onClick={() => {
                void navigator.clipboard
                  .writeText(
                    `기록물철 제목: ${detail.title}\n생산연도: ${detail.year}\n공개여부: 비공개\n열람범위: 직원 열람제한`
                  )
                  .then(() => notify('등록 정보를 복사했습니다.'))
                  .catch(() => notify('텍스트를 직접 선택해 복사해 주세요.'))
              }}
            >
              등록 정보 복사
            </Button>
          </Panel>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={
            confirm === 'package'
              ? '이관 패키지 구성을 확인할까요?'
              : confirm === 'finalize'
                ? '기록물철을 확정할까요?'
                : '이관 완료로 표시할까요?'
          }
          onClose={() => setConfirm('')}
        >
          <p>
            {confirm === 'package'
              ? '선택한 철마다 정본 PDF + 무결성 목록(MANIFEST) + 이관목록 엑셀을 구성합니다. 이 PoC에서는 파일을 만들지 않습니다.'
              : '확인하면 화면의 기록물철 상태가 변경됩니다. 외부 기관에는 전송되지 않습니다.'}
          </p>
          <Actions>
            <Button variant="secondary" onClick={() => setConfirm('')}>
              취소
            </Button>
            <Button
              onClick={() => {
                if (confirm === 'package') setPreview('이관 패키지')
                else if (detail)
                  update({ ...detail, state: confirm === 'finalize' ? '확정' : '이관 완료' })
                setConfirm('')
              }}
            >
              확인
            </Button>
          </Actions>
        </Modal>
      )}
      {preview && (
        <PrintPreview title={preview} onClose={() => setPreview('')}>
          <p>상담 기록(비고) {internal ? '포함' : '제외'}</p>
          {preview === '이관 패키지' && <p>정본.pdf / MANIFEST.json / 이관목록.xlsx</p>}
          {(detail
            ? [detail]
            : archives.filter((a) => !selected.length || selected.includes(a.id))
          ).map((a) => (
            <div key={a.id}>
              <h3>{a.title}</h3>
              <p>
                {a.state} · 이관처 {a.recipient || '미정'} · {a.date || '일자 미정'}
              </p>
            </div>
          ))}
          {preview === '정본 PDF' && (
            <SessionTable
              sessions={data.sessions.filter(
                (s) =>
                  s.schoolId === data.activeSchoolId &&
                  s.status === '완료' &&
                  s.start.startsWith(String(detail?.year))
              )}
            />
          )}
        </PrintPreview>
      )}
    </>
  )
}
export function SettingsPage(): React.JSX.Element {
  const { data, setData, path, navigate, notify } = useWorkspace()
  const raw = path.split('#settings-')[1] || 'general',
    tab = settingKeys.includes(raw) ? raw : 'general'
  const [prefs, setPrefs] = useState(data.settings),
    [extra, setExtra] = useState({
      affiliation: '학교',
      classification: '개인상담',
      stale: 30,
      sound: true,
      interval: '일주일마다',
      folder: '문서 / 위토리 / 백업'
    }),
    [school, setSchool] = useState<School | null>(null),
    [pin, setPin] = useState({ current: '', next: '', confirm: '' }),
    [recovery, setRecovery] = useState(''),
    [verify, setVerify] = useState(''),
    [modal, setModal] = useState(''),
    [snapshot, setSnapshot] = useState<WorkspaceData | null>(null),
    [previous, setPrevious] = useState<WorkspaceData | null>(null),
    [account, setAccount] = useState({
      email: '',
      logged: false,
      code: '',
      otp: '',
      requested: false
    }),
    [locked, setLocked] = useState(false)
  const active = data.schools.find((s) => s.id === data.activeSchoolId)
  function save(): void {
    setData((d) => ({ ...d, settings: { ...prefs, schoolYear: d.settings.schoolYear } }))
    notify('설정을 화면에 적용했습니다.')
  }
  function changeTime(index: number, key: 'start' | 'end', value: string): void {
    const rows = prefs.timetable.map((t) => ({ ...t }))
    rows[index][key] = value
    const mins = (v: string): number => {
      const [h, m] = v.split(':').map(Number)
      return h * 60 + m
    }
    const fmt = (m: number): string =>
      `${String(Math.floor(((m + 1440) % 1440) / 60)).padStart(2, '0')}:${String((m + 1440) % 60).padStart(2, '0')}`
    if (key === 'start') {
      const delta = mins(value) - mins(prefs.timetable[index].start)
      rows[index].end = fmt(mins(rows[index].end) + delta)
    }
    const delta = mins(rows[index].end) - mins(prefs.timetable[index].end)
    for (let i = index + 1; i < rows.length; i++) {
      rows[i].start = fmt(mins(rows[i].start) + delta)
      rows[i].end = fmt(mins(rows[i].end) + delta)
    }
    setPrefs({ ...prefs, timetable: rows })
  }
  return (
    <>
      <PageHeading title="설정" subtitle="나의 상담 환경을 편안하게 맞춰보세요." />
      <Tabs
        items={SETTING_TABS}
        value={SETTING_TABS[settingKeys.indexOf(tab)]}
        onChange={(v) =>
          navigate(
            `/settings#settings-${settingKeys[SETTING_TABS.indexOf(v as (typeof SETTING_TABS)[number])]}`
          )
        }
      />
      <DemoNotice />
      {tab === 'general' && (
        <Panel title="기본 정보">
          <div className="form-grid">
            <Field label="작업학년도">
              <TextInput readOnly value={data.settings.schoolYear} />
            </Field>
            <Field label="상담사 이름">
              <TextInput
                value={prefs.counselor}
                onChange={(e) => setPrefs({ ...prefs, counselor: e.target.value })}
              />
            </Field>
            <Field label="상담사 소속">
              <FormSelect
                value={extra.affiliation}
                onValueChange={(e) => setExtra({ ...extra, affiliation: e })}
              >
                {['학교', 'Wee센터', '교육지원청', '기타'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </FormSelect>
            </Field>
            <Field label="상담분류 기본값">
              <FormSelect
                value={extra.classification}
                onValueChange={(e) => setExtra({ ...extra, classification: e })}
              >
                {CATEGORIES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </FormSelect>
            </Field>
            <Field label="장기 미접촉 기준일">
              <TextInput
                type="number"
                min={1}
                value={extra.stale}
                onChange={(e) => setExtra({ ...extra, stale: Number(e.target.value) })}
              />
            </Field>
            <Field label="자동 잠금">
              <FormSelect
                value={prefs.autoLock}
                onValueChange={(e) => setPrefs({ ...prefs, autoLock: Number(e) })}
              >
                {[0, 5, 10, 15, 30].map((n) => (
                  <option value={n} key={n}>
                    {n ? `${n}분` : '사용 안 함'}
                  </option>
                ))}
              </FormSelect>
            </Field>
          </div>
          <label>
            <FormCheckbox
              checked={extra.sound}
              onCheckedChange={(e) => setExtra({ ...extra, sound: e })}
            />{' '}
            알림음
          </label>
          <p className="wt-note">
            자동 잠금·알림음은 화면 설정만 보관합니다. 기기 보안 기능은 후속 구현 대상입니다.
          </p>
          <Actions>
            <Button disabled={!prefs.counselor.trim() || extra.stale < 1} onClick={save}>
              기본 정보 저장
            </Button>
          </Actions>
        </Panel>
      )}
      {tab === 'schools' && (
        <Panel title="학교 관리">
          <p>학교를 추가하면 학교별 학생과 상담 기록을 나누어 살펴볼 수 있습니다.</p>
          {data.schools.map((s, index) => (
            <div className="wt-school-row" key={s.id}>
              <div>
                <strong>{s.name}</strong>{' '}
                <Badge tone={s.archived ? 'gray' : 'blue'}>
                  {s.archived ? '보관됨' : s.id === data.activeSchoolId ? '현재 학교' : s.type}
                </Badge>
                <p>
                  {s.weeClass} · {s.phone || '연락처 미입력'}
                </p>
              </div>
              <Actions>
                <Button
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() =>
                    setData((d) => {
                      const schools = [...d.schools]
                      ;[schools[index - 1], schools[index]] = [schools[index], schools[index - 1]]
                      return { ...d, schools }
                    })
                  }
                >
                  위로
                </Button>
                <Button variant="ghost" onClick={() => setSchool({ ...s })}>
                  수정
                </Button>
                {!s.archived && s.id !== data.activeSchoolId && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setData((d) => ({ ...d, activeSchoolId: s.id }))
                      notify(`${s.name}로 전환했습니다.`)
                    }}
                  >
                    전환
                  </Button>
                )}
                <Button
                  variant="ghost"
                  disabled={!s.archived && data.schools.filter((x) => !x.archived).length === 1}
                  onClick={() => {
                    if (s.archived) {
                      setData((d) => ({
                        ...d,
                        schools: d.schools.map((x) =>
                          x.id === s.id ? { ...x, archived: false } : x
                        )
                      }))
                    } else {
                      setSchool({ ...s })
                      setModal('archive-school')
                    }
                  }}
                >
                  {s.archived ? '다시 사용' : '보관'}
                </Button>
              </Actions>
            </div>
          ))}
          <Button
            onClick={() =>
              setSchool({
                id: uid(),
                name: '',
                type: '초등학교',
                weeClass: 'Wee클래스',
                phone: '',
                archived: false
              })
            }
          >
            학교 추가
          </Button>
        </Panel>
      )}
      {tab === 'timetable' && (
        <Panel title="시간표(교시) 설정">
          <p>
            {active?.name} · 시작 시각 또는 종료 시각을 바꾸면 다음 교시도 간격을 유지하며
            이동합니다.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>교시</TableHead>
                <TableHead>시작</TableHead>
                <TableHead>종료</TableHead>
                <TableHead>소요</TableHead>
                <th />
              </TableRow>
            </TableHeader>
            <TableBody>
              {prefs.timetable.map((t, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <TextInput
                      aria-label={`${i + 1}행 교시`}
                      value={t.name}
                      onChange={(e) =>
                        setPrefs({
                          ...prefs,
                          timetable: prefs.timetable.map((x, j) =>
                            i === j ? { ...x, name: e.target.value } : x
                          )
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <TextInput
                      aria-label={`${i + 1}행 시작`}
                      type="time"
                      value={t.start}
                      onChange={(e) => changeTime(i, 'start', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextInput
                      aria-label={`${i + 1}행 종료`}
                      type="time"
                      value={t.end}
                      onChange={(e) => changeTime(i, 'end', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    {Math.round(
                      (new Date(`2026-01-01T${t.end}`).getTime() -
                        new Date(`2026-01-01T${t.start}`).getTime()) /
                        60000
                    )}
                    분
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setPrefs({ ...prefs, timetable: prefs.timetable.filter((_, j) => i !== j) })
                      }
                    >
                      삭제
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Actions>
            <Button
              variant="secondary"
              onClick={() =>
                setPrefs({
                  ...prefs,
                  timetable: [
                    ...prefs.timetable,
                    { name: `${prefs.timetable.length + 1}교시`, start: '14:40', end: '15:20' }
                  ]
                })
              }
            >
              행 추가
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                setPrefs({
                  ...prefs,
                  timetable: Array.from({ length: 6 }, (_, i) => ({
                    name: `${i + 1}교시`,
                    start: `${String(9 + i).padStart(2, '0')}:00`,
                    end: `${String(9 + i).padStart(2, '0')}:40`
                  }))
                })
              }
            >
              기본값으로 재생성
            </Button>
            <Button onClick={save}>시간표 저장</Button>
          </Actions>
        </Panel>
      )}
      {tab === 'security' && (
        <>
          <Panel title="PIN 변경">
            <p>
              화면 흐름을 확인하기 위한 PIN입니다. 실제 데이터 암호화나 기기 잠금은 수행하지
              않습니다.
            </p>
            <div className="form-grid">
              {(['current', 'next', 'confirm'] as const).map((key, i) => (
                <Field key={key} label={['현재 PIN', '새 PIN', '새 PIN 확인'][i]}>
                  <TextInput
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin[key]}
                    onChange={(e) => setPin({ ...pin, [key]: e.target.value.replace(/\D/g, '') })}
                  />
                </Field>
              ))}
            </div>
            <Actions>
              <Button
                disabled={!/^\d{4}$/.test(pin.next) || pin.next !== pin.confirm}
                onClick={() => {
                  if (data.settings.pin && pin.current !== data.settings.pin) {
                    notify('현재 PIN이 일치하지 않습니다.')
                    return
                  }
                  setData((d) => ({ ...d, settings: { ...d.settings, pin: pin.next } }))
                  setPrefs((p) => ({ ...p, pin: pin.next }))
                  setPin({ current: '', next: '', confirm: '' })
                  notify('PoC PIN을 변경했습니다.')
                }}
              >
                PIN 변경
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setLocked(true)
                  setVerify('')
                }}
              >
                잠금 화면 미리보기
              </Button>
            </Actions>
          </Panel>
          <Panel title="복구 코드">
            <p>예시 코드로 생성·확인 흐름을 체험합니다. 실제 암호화 키가 아닙니다.</p>
            {recovery && (
              <>
                <code className="wt-code">{recovery}</code>
                <Field label="복구 코드 확인">
                  <TextInput value={verify} onChange={(e) => setVerify(e.target.value)} />
                </Field>
                <Button
                  variant="secondary"
                  onClick={() =>
                    notify(
                      verify === recovery ? '예시 코드가 일치합니다.' : '코드가 일치하지 않습니다.'
                    )
                  }
                >
                  코드 확인
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={() => setModal('recovery')}>
              {recovery ? '복구 코드 재생성' : '복구 코드 생성'}
            </Button>
          </Panel>
        </>
      )}
      {tab === 'backup' && (
        <Panel title="데이터 백업 / 복원">
          <p>
            현재 화면 상태를 메모리에 복사하고 되돌리는 PoC입니다. 파일 백업은 생성하지 않습니다.
          </p>
          <Actions>
            <Button onClick={() => setModal('backup')}>백업하기</Button>
            <Button variant="secondary" disabled={!snapshot} onClick={() => setModal('restore')}>
              되돌리기
            </Button>
            <Button
              variant="secondary"
              disabled={!previous}
              onClick={() => {
                if (previous) {
                  setData(previous)
                  setPrevious(null)
                  notify('복원 직전 화면 상태로 돌아왔습니다.')
                }
              }}
            >
              직전 상태로 되돌리기
            </Button>
            <Button variant="ghost" onClick={() => setModal('reset')}>
              데이터 초기화
            </Button>
          </Actions>
          {snapshot && (
            <p>
              <Badge>화면 백업 있음</Badge> 학생 {snapshot.students.length}명 · 상담{' '}
              {snapshot.sessions.length}건
            </p>
          )}
        </Panel>
      )}
      {tab === 'auto-backup' && (
        <Panel title="자동 백업">
          <p>설정 화면만 제공합니다. 백그라운드 백업은 실행되지 않습니다.</p>
          <label>
            <FormCheckbox
              checked={prefs.autoBackup}
              onCheckedChange={(e) => setPrefs({ ...prefs, autoBackup: e })}
            />{' '}
            자동 백업 사용
          </label>
          <div className="form-grid">
            <Field label="저장 폴더">
              <TextInput
                value={extra.folder}
                onChange={(e) => setExtra({ ...extra, folder: e.target.value })}
              />
            </Field>
            <Field label="주기">
              <FormSelect
                value={extra.interval}
                onValueChange={(e) => setExtra({ ...extra, interval: e })}
              >
                {['매일', '일주일마다', '2주마다', '한 달마다'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </FormSelect>
            </Field>
            <Field label="남길 개수">
              <FormSelect
                value={prefs.backupRetention}
                onValueChange={(e) => setPrefs({ ...prefs, backupRetention: Number(e) })}
              >
                {[5, 10, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    최근 {n}개
                  </option>
                ))}
              </FormSelect>
            </Field>
            <Field label="확인 시각">
              <TextInput
                type="time"
                value={prefs.backupTime}
                onChange={(e) => setPrefs({ ...prefs, backupTime: e.target.value })}
              />
            </Field>
          </div>
          <Actions>
            <Button onClick={save}>설정 저장</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSnapshot(structuredClone(data))
                notify(
                  '현재 화면 상태를 메모리에 복사했습니다. 실제 자동 백업은 실행하지 않습니다.'
                )
              }}
            >
              지금 한 번 만들기
            </Button>
          </Actions>
        </Panel>
      )}
      {tab === 'subscription' && (
        <Panel title="구독 / 계정">
          <Badge tone="blue">협업 PoC</Badge>
          <p>{account.logged ? `${account.email} · 로그인 화면 체험 중` : '로그인되지 않음'}</p>
          <p>계정·결제 서버를 연결하지 않았습니다. 아래 동작은 화면 시뮬레이션입니다.</p>
          <Actions>
            {account.logged ? (
              <>
                <Button variant="secondary" onClick={() => setModal('redeem')}>
                  구독 코드 등록
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => notify('PoC 상태입니다. 구독 서버에 요청하지 않았습니다.')}
                >
                  새로고침
                </Button>
                <Button variant="ghost" onClick={() => setAccount({ ...account, logged: false })}>
                  로그아웃
                </Button>
                <Button variant="ghost" onClick={() => setModal('delete-account')}>
                  계정 삭제
                </Button>
              </>
            ) : (
              <Button onClick={() => setModal('login')}>로그인</Button>
            )}
          </Actions>
        </Panel>
      )}
      {tab === 'documents' && (
        <Panel title="문서 저장 폴더">
          <p>앱에서 만든 정본 PDF·동의서·엑셀을 모아 두는 위치입니다.</p>
          <Field label="폴더 경로 (예시)">
            <TextInput
              value={prefs.documentFolder}
              onChange={(e) => setPrefs({ ...prefs, documentFolder: e.target.value })}
            />
          </Field>
          <Actions>
            <Button onClick={() => setModal('folder')}>위치 변경</Button>
            <Button variant="secondary" onClick={() => setModal('folder-preview')}>
              폴더 구조 보기
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPrefs({ ...prefs, documentFolder: '문서 / 위토리' })}
            >
              기본 위치 사용
            </Button>
          </Actions>
        </Panel>
      )}
      {tab === 'attribution' && (
        <Panel title="공공데이터 출처">
          <dl>
            <dt>학교 검색·학사일정</dt>
            <dd>교육부 · 나이스 교육정보 개방 포털 (open.neis.go.kr)</dd>
            <dt>공휴일</dt>
            <dd>한국천문연구원 · 공공데이터포털 (data.go.kr)</dd>
          </dl>
          <p>
            이 PoC의 학생·상담·학교 정보는 화면 확인용 예시입니다. 현재 공공 API에는 연결하지
            않았습니다.
          </p>
        </Panel>
      )}
      {school && !modal && (
        <Modal
          title={data.schools.some((s) => s.id === school.id) ? '학교 정보 수정' : '학교 추가'}
          onClose={() => setSchool(null)}
        >
          <Field label="학교명">
            <TextInput
              value={school.name}
              onChange={(e) => setSchool({ ...school, name: e.target.value })}
            />
          </Field>
          <Field label="학교급">
            <FormSelect
              value={school.type}
              onValueChange={(e) => setSchool({ ...school, type: e })}
            >
              {['초등학교', '중학교', '고등학교', '특수학교', '기타'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </FormSelect>
          </Field>
          <Field label="Wee설치여부">
            <FormSelect
              value={school.weeClass}
              onValueChange={(e) => setSchool({ ...school, weeClass: e })}
            >
              <option>Wee클래스</option>
              <option>Wee센터</option>
              <option>일반</option>
            </FormSelect>
          </Field>
          <Field label="상담실 전화번호">
            <TextInput
              value={school.phone}
              onChange={(e) => setSchool({ ...school, phone: e.target.value })}
            />
          </Field>
          <Actions>
            <Button variant="secondary" onClick={() => setSchool(null)}>
              취소
            </Button>
            <Button
              disabled={!school.name.trim()}
              onClick={() => {
                setData((d) => ({
                  ...d,
                  schools: d.schools.some((s) => s.id === school.id)
                    ? d.schools.map((s) => (s.id === school.id ? school : s))
                    : [...d.schools, school]
                }))
                setSchool(null)
                notify('학교 정보를 저장했습니다.')
              }}
            >
              저장
            </Button>
          </Actions>
        </Modal>
      )}
      {locked && (
        <Modal title="화면 잠금 미리보기" onClose={() => setLocked(false)}>
          <p>실제 보안 잠금이 아닌 화면 미리보기입니다.</p>
          <Field label="PIN">
            <TextInput
              type="password"
              maxLength={4}
              value={verify}
              onChange={(e) => setVerify(e.target.value)}
            />
          </Field>
          <Button
            onClick={() => {
              if (!data.settings.pin || verify === data.settings.pin) {
                setLocked(false)
                notify('잠금 화면 미리보기를 종료했습니다.')
              } else notify('PIN이 일치하지 않습니다.')
            }}
          >
            잠금 해제
          </Button>
        </Modal>
      )}
      {modal && (
        <Modal
          title={
            (
              {
                'archive-school': '학교를 보관할까요?',
                recovery: '예시 복구 코드 생성',
                backup: '화면 상태 백업',
                restore: '백업한 화면 상태로 되돌릴까요?',
                reset: '현재 학교 데이터를 초기화할까요?',
                login: '로그인 화면 체험',
                redeem: '구독 코드 등록',
                'delete-account': '계정 삭제 화면 확인',
                folder: '문서 위치 변경',
                'folder-preview': '문서 폴더 구조'
              } as Record<string, string>
            )[modal] || modal
          }
          onClose={() => {
            setModal('')
            if (modal === 'archive-school') setSchool(null)
          }}
        >
          {modal === 'login' ? (
            <>
              <Field label="이메일">
                <TextInput
                  type="email"
                  value={account.email}
                  onChange={(e) => setAccount({ ...account, email: e.target.value })}
                />
              </Field>
              {account.requested && (
                <>
                  <p>실제 메일은 보내지 않았습니다. 체험 코드: 123456</p>
                  <Field label="인증번호">
                    <TextInput
                      value={account.otp}
                      onChange={(e) => setAccount({ ...account, otp: e.target.value })}
                    />
                  </Field>
                </>
              )}
              <Actions>
                <Button
                  variant="secondary"
                  onClick={() =>
                    notify('Google OAuth는 연결하지 않았습니다. 이메일 로그인 체험을 이용하세요.')
                  }
                >
                  Google로 계속
                </Button>
                <Button
                  disabled={!account.email.includes('@')}
                  onClick={() => {
                    if (!account.requested) setAccount({ ...account, requested: true })
                    else if (account.otp === '123456') {
                      setAccount({ ...account, logged: true })
                      setModal('')
                      notify('로그인 화면 체험을 완료했습니다.')
                    } else notify('체험 코드 123456을 입력하세요.')
                  }}
                >
                  {account.requested ? '인증 확인' : '인증번호 요청 체험'}
                </Button>
              </Actions>
            </>
          ) : modal === 'redeem' ? (
            <>
              <Field label="구독 코드">
                <TextInput
                  value={account.code}
                  onChange={(e) => setAccount({ ...account, code: e.target.value })}
                />
              </Field>
              <p>실제 이용권은 등록되지 않습니다.</p>
              <Button
                disabled={!account.code.trim()}
                onClick={() => {
                  setModal('')
                  notify('코드 입력을 확인했습니다. 실제 구독 상태는 변경하지 않습니다.')
                }}
              >
                코드 입력 확인
              </Button>
            </>
          ) : modal === 'folder-preview' ? (
            <>
              <p>{prefs.documentFolder}</p>
              <ul>
                <li>
                  {active?.name}
                  <ul>
                    <li>학생별 상담 기록</li>
                    <li>상담 보고서</li>
                    <li>기록물 보관·이관</li>
                    <li>동의서 사본</li>
                  </ul>
                </li>
              </ul>
              <p>예상 폴더 구조이며 실제 폴더를 만들지 않았습니다.</p>
            </>
          ) : (
            <>
              <p>
                {modal === 'archive-school'
                  ? '목록에서 숨기며 기록은 유지됩니다. 현재 학교라면 다른 학교로 전환합니다.'
                  : modal === 'recovery'
                    ? '새 예시 코드를 만들면 이전 예시 코드는 더 이상 확인할 수 없습니다.'
                    : modal === 'reset'
                      ? '현재 학교의 예시 학생·사례·상담·기록물철을 비웁니다. 먼저 화면 백업을 만들 수 있습니다.'
                      : modal === 'folder'
                        ? '인터넷 동기화 폴더 사용 여부를 확인하세요. 입력한 경로는 화면에만 적용됩니다.'
                        : modal === 'delete-account'
                          ? 'PoC 로그인 상태만 지웁니다. 상담 기록은 남습니다. 실제 계정 서버에는 요청하지 않습니다.'
                          : '이 작업은 메모리 안의 화면 상태에만 적용됩니다.'}
              </p>
              <Actions>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setModal('')
                    if (modal === 'archive-school') setSchool(null)
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={() => {
                    if (modal === 'archive-school' && school) {
                      setData((d) => ({
                        ...d,
                        schools: d.schools.map((s) =>
                          s.id === school.id ? { ...s, archived: true } : s
                        ),
                        activeSchoolId:
                          d.activeSchoolId === school.id
                            ? d.schools.find((s) => s.id !== school.id && !s.archived)!.id
                            : d.activeSchoolId
                      }))
                      setSchool(null)
                    }
                    if (modal === 'recovery') setRecovery(`POC-${uid().slice(0, 8).toUpperCase()}`)
                    if (modal === 'backup') setSnapshot(structuredClone(data))
                    if (modal === 'restore' && snapshot) {
                      setPrevious(structuredClone(data))
                      setData(structuredClone(snapshot))
                    }
                    if (modal === 'reset') {
                      setPrevious(structuredClone(data))
                      setData((d) => ({
                        ...d,
                        students: d.students.filter((s) => s.schoolId !== d.activeSchoolId),
                        cases: d.cases.filter((s) => s.schoolId !== d.activeSchoolId),
                        sessions: d.sessions.filter((s) => s.schoolId !== d.activeSchoolId),
                        archives: d.archives.filter((s) => s.schoolId !== d.activeSchoolId)
                      }))
                    }
                    if (modal === 'delete-account')
                      setAccount({ email: '', logged: false, code: '', otp: '', requested: false })
                    if (modal === 'folder') save()
                    setModal('')
                    notify('화면에 반영했습니다.')
                  }}
                >
                  확인
                </Button>
              </Actions>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
const NOTICES = [
  {
    id: 'n1',
    category: '안내',
    title: '위토리 협업 PoC 사용 안내',
    date: '2026-10-28',
    body: '이 화면은 원본 위토리의 메뉴와 동작을 확인하기 위한 협업용 PoC입니다. 학생·사례·상담은 예시 데이터이며 변경은 메모리에만 반영됩니다.',
    important: true
  },
  {
    id: 'n2',
    category: '업데이트',
    title: '상담 기록과 보고서 화면을 둘러보세요',
    date: '2026-10-27',
    body: '학생 관리에서 학생을 선택하고 사례·상담 기록으로 이동할 수 있습니다. 보고서에서 나이스 엑셀, 상담관리대장, 관리자 보고서, 기록물 보관·이관 화면을 확인해 주세요.',
    important: false
  },
  {
    id: 'n3',
    category: '주의',
    title: 'PoC 데이터 보관 안내',
    date: '2026-10-26',
    body: '이 앱은 화면 검토 단계입니다. 실제 개인정보를 입력하지 말고 예시 데이터로 확인해 주세요. 앱을 종료하면 변경 내용이 초기화됩니다.',
    important: true
  }
]
export function NoticesPage(): React.JSX.Element {
  const { notify } = useWorkspace()
  const [filter, setFilter] = useState('전체'),
    [open, setOpen] = useState<string[]>([]),
    [read, setRead] = useState<string[]>([]),
    [search, setSearch] = useState('')
  const rows = NOTICES.filter(
    (n) =>
      (filter === '전체' || n.category === filter) &&
      (!search || (n.title + n.body).includes(search))
  )
  return (
    <>
      <PageHeading title="공지사항" subtitle="협업 PoC 안내와 화면 업데이트를 확인하세요.">
        <Button
          variant="secondary"
          onClick={() =>
            notify('로컬 예시 공지를 다시 확인했습니다. 외부 서버는 연결하지 않았습니다.')
          }
        >
          새로고침
        </Button>
        <Button variant="ghost" onClick={() => setRead(NOTICES.map((n) => n.id))}>
          모두 읽음
        </Button>
      </PageHeading>
      <Tabs items={['전체', '안내', '주의', '업데이트']} value={filter} onChange={setFilter} />
      <div className="mb-6 max-w-xl">
        <Field label="공지 검색">
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목 또는 내용 검색"
          />
        </Field>
      </div>
      {rows.length ? (
        rows.map((n) => (
          <Panel key={n.id} title={n.title}>
            <div className="wt-notice-meta">
              <Badge tone={n.category === '주의' ? 'amber' : 'blue'}>{n.category}</Badge>
              {n.important && <Badge tone="amber">중요</Badge>}
              {!read.includes(n.id) && <Badge>새 공지</Badge>}
              <span>{n.date}</span>
            </div>
            {open.includes(n.id) && <p>{n.body}</p>}
            <Button
              variant="ghost"
              onClick={() => {
                setOpen((ids) =>
                  ids.includes(n.id) ? ids.filter((x) => x !== n.id) : [...ids, n.id]
                )
                setRead((ids) => (ids.includes(n.id) ? ids : [...ids, n.id]))
              }}
            >
              {open.includes(n.id) ? '접기' : '자세히 보기'}
            </Button>
          </Panel>
        ))
      ) : (
        <Empty title="검색된 공지사항이 없습니다." />
      )}
    </>
  )
}
