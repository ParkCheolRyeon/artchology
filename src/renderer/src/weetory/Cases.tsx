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
import { DateInput, FormSelect, FormCheckbox } from '../components/form-controls'
import { useState } from 'react'
import { Plus, FileText, ArrowRight, Download, Settings, Pencil } from 'lucide-react'
import { useWorkspace } from './context'
import {
  CATEGORIES,
  TOPICS,
  day,
  uid,
  type CaseRecord,
  type Meeting,
  type Concept,
  type Consent
} from './model'
import { Back, Badge, Button, DemoNotice, Empty, Field, Modal, PageHeading, Tabs } from './ui'

const detailTabs = ['개요', '사례 개념화', '상담 기록', '동의서']
function Input({
  label,
  value,
  onChange,
  type = 'text',
  required = false
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}): React.JSX.Element {
  return (
    <Field label={label}>
      {type === 'date' || type === 'datetime-local' ? (
        <DateInput type={type} value={value} onValueChange={onChange} required={required} />
      ) : (
        <TextInput
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </Field>
  )
}
function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}): React.JSX.Element {
  return (
    <Field label={label}>
      <FormSelect value={value} onValueChange={(e) => onChange(e)}>
        {options.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </FormSelect>
    </Field>
  )
}
function Text({
  label,
  value,
  onChange,
  rows = 4
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
}): React.JSX.Element {
  return (
    <Field label={label} full>
      <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}
function download(name: string, text: string, type = 'text/plain;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function CaseList(): React.JSX.Element {
  const { data, navigate, path } = useWorkspace()
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState(
      new URLSearchParams(path.split('?')[1] || '').get('status') || '전체'
    ),
    [sort, setSort] = useState('최근 등록순'),
    [layout, setLayout] = useState('카드')
  const scoped = data.cases.filter(
    (c) => c.schoolId === data.activeSchoolId && c.year === data.settings.schoolYear
  )
  const names = (c: CaseRecord): string =>
    data.students
      .filter((s) => c.studentIds.includes(s.id))
      .map((s) => s.name)
      .join(', ')
  const records = scoped
    .filter(
      (c) =>
        (status === '전체' || c.status === status) &&
        `${names(c)} ${c.number} ${c.complaint}`.includes(query)
    )
    .sort((a, b) =>
      sort === '사례번호순'
        ? a.number.localeCompare(b.number)
        : b.createdAt.localeCompare(a.createdAt)
    )
  return (
    <div className="wt-stack">
      <PageHeading title="사례 관리" subtitle="학생의 이야기를 이어가는 상담 사례">
        <Button variant="secondary" onClick={() => navigate('/cases/numbers')}>
          <Settings size={16} />
          사례번호 정리
        </Button>
        <Button variant="secondary" onClick={() => navigate('/cases/new/neis-import')}>
          나이스 상담일지 가져오기
        </Button>
        <Button onClick={() => navigate('/cases/new')}>
          <Plus size={16} />새 사례 등록
        </Button>
      </PageHeading>
      <DemoNotice />
      <div className="wt-grid">
        {['전체', '진행', '종결'].map((x) => (
          <button
            className="rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={status === x}
            key={x}
            onClick={() => setStatus(x)}
          >
            <span className="block text-[13px] font-medium text-muted-foreground">
              {x === '전체' ? '전체 사례' : x + ' 사례'}
            </span>
            <strong className="mt-3 block text-[28px] font-semibold leading-none tracking-tight tabular-nums">
              {scoped.filter((c) => x === '전체' || c.status === x).length}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">건</span>
            </strong>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(220px,2fr)_repeat(3,minmax(100px,1fr))] items-end gap-4 rounded-xl border bg-card p-5 max-[1050px]:grid-cols-2">
        <Field label="학생 이름·사례번호·주호소 검색">
          <TextInput
            placeholder="학생 이름이나 사례번호를 입력하세요"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Select
          label="상태"
          value={status}
          onChange={setStatus}
          options={['전체', '진행', '종결']}
        />
        <Select
          label="정렬"
          value={sort}
          onChange={setSort}
          options={['최근 등록순', '사례번호순']}
        />
        <Select label="보기" value={layout} onChange={setLayout} options={['카드', '목록']} />
      </div>
      <p className="wt-muted">
        {data.settings.schoolYear}학년도 · {records.length}개 사례
      </p>
      {!records.length ? (
        <Empty
          title="조건에 맞는 사례가 없습니다"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('')
                setStatus('전체')
              }}
            >
              필터 초기화
            </Button>
          }
        />
      ) : layout === '카드' ? (
        <div className="wt-grid">
          {records.map((c) => (
            <button
              className="surface wt-card text-left transition-colors hover:border-primary/30"
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
            >
              <div className="wt-toolbar">
                <span className="wt-muted">{c.number}</span>
                <Badge tone={c.status === '진행' ? 'blue' : 'gray'}>{c.status}</Badge>
              </div>
              <h2>{names(c) || '학생 미지정'}</h2>
              <p>{c.complaint}</p>
              <div className="wt-toolbar">
                <span>상담 {data.sessions.filter((s) => s.caseId === c.id).length}회</span>
                <span>{c.createdAt}</span>
                <ArrowRight size={16} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="surface">
          <Table className="wt-table">
            <TableHeader>
              <TableRow>
                <TableHead>사례번호</TableHead>
                <TableHead>학생</TableHead>
                <TableHead>주호소</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>상담</TableHead>
                <TableHead>열기</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.number}</TableCell>
                  <TableCell>{names(c)}</TableCell>
                  <TableCell>{c.complaint}</TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell>{data.sessions.filter((s) => s.caseId === c.id).length}회</TableCell>
                  <TableCell>
                    <Button variant="ghost" onClick={() => navigate(`/cases/${c.id}`)}>
                      상세 보기
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
function CaseForm({ record }: { record?: CaseRecord }): React.JSX.Element {
  const { data, setData, navigate, notify, path } = useWorkspace()
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const year = data.settings.schoolYear
  const pattern = data.numberPattern.match(/^(.*)\[(\d)자리\](?: 시작 (\d+))?$/)
  const prefix = pattern?.[1] ?? `${year}-`
  const digits = Number(pattern?.[2] ?? 3)
  const occupied = data.cases.filter((c) => c.schoolId === data.activeSchoolId).map((c) => c.number)
  let sequence = Math.max(1, Number(pattern?.[3] ?? 1))
  while (occupied.includes(`${prefix}${String(sequence).padStart(digits, '0')}`)) sequence++
  const [form, setForm] = useState<CaseRecord>(
    record ?? {
      id: uid(),
      schoolId: data.activeSchoolId,
      year,
      number: `${prefix}${String(sequence).padStart(digits, '0')}`,
      studentIds: data.students
        .filter(
          (s) =>
            s.schoolId === data.activeSchoolId &&
            s.id === new URLSearchParams(path.split('?')[1] || '').get('studentId')
        )
        .map((s) => s.id),
      complaint: '',
      goal: '',
      teacherOpinion: '',
      notes: '',
      referrer: '',
      referrerRole: '교사',
      referrerContact: '',
      status: '진행',
      createdAt: day(),
      closedAt: '',
      closeReason: '',
      concepts: [],
      consents: []
    }
  )
  const patch = (key: keyof CaseRecord, value: string): void =>
    setForm((f) => ({ ...f, [key]: value }))
  const cancel = (): void => navigate(record ? `/cases/${record.id}` : '/cases')
  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!form.studentIds.length || !form.complaint.trim()) {
      setError('학생을 한 명 이상 선택하고 주호소를 입력해 주세요.')
      return
    }
    if (
      data.cases.some(
        (c) => c.id !== form.id && c.schoolId === form.schoolId && c.number === form.number.trim()
      )
    ) {
      setError('이미 사용 중인 사례번호입니다. 다른 번호를 입력해 주세요.')
      return
    }
    setData((d) => ({
      ...d,
      cases: record
        ? d.cases.map((c) => (c.id === form.id ? form : c))
        : [...d.cases, { ...form, number: form.number.trim() }]
    }))
    notify(record ? '사례 정보를 수정했습니다.' : '사례를 등록했습니다.')
    navigate(`/cases/${form.id}`)
  }
  return (
    <div className="wt-stack">
      <Back onClick={cancel} />
      <PageHeading
        title={record ? '사례 수정' : '새 사례 등록'}
        subtitle="내담자와 상담의 시작점을 기록합니다."
      />
      <form className="wt-stack" onSubmit={submit}>
        <Surface className="surface wt-section">
          <h2>내담자·보호자 정보</h2>
          <div className="form-grid">
            <Field label="학년도">
              <TextInput value={`${form.year}학년도`} disabled />
            </Field>
            <Field label="사례번호">
              <TextInput
                value={form.number}
                required
                maxLength={100}
                disabled={!!record}
                onChange={(e) => patch('number', e.target.value)}
              />
            </Field>
          </div>
          {record && <p className="wt-note">사례번호는 사례번호 정리에서 변경합니다.</p>}
          <Input label="학생 찾기" value={search} onChange={setSearch} />
          <div className="wt-grid">
            {data.students
              .filter((s) => s.schoolId === data.activeSchoolId && s.name.includes(search))
              .map((s) => {
                const enrollment = s.enrollments.find((e) => e.year === form.year)
                return (
                  <label className="wt-choice" key={s.id}>
                    <FormCheckbox
                      checked={form.studentIds.includes(s.id)}
                      onCheckedChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          studentIds: e
                            ? [...f.studentIds, s.id]
                            : f.studentIds.filter((id) => id !== s.id)
                        }))
                      }
                    />
                    <span>
                      <strong>{s.name}</strong> ·{' '}
                      {enrollment
                        ? `${enrollment.grade}학년 ${enrollment.classroom}반 ${enrollment.number}번`
                        : '학적 미등록'}
                      <small>
                        보호자 {s.guardianName || '미입력'} · {s.guardianContact || '연락처 미입력'}
                      </small>
                    </span>
                  </label>
                )
              })}
          </div>
          <Button type="button" variant="ghost" onClick={() => navigate('/students')}>
            학생 관리에서 학생 등록·보호자 정보 수정
          </Button>
        </Surface>
        <Surface className="surface wt-section">
          <h2>의뢰 정보</h2>
          <div className="form-grid">
            <Input
              label="의뢰인 이름"
              value={form.referrer}
              onChange={(v) => patch('referrer', v)}
            />
            <Select
              label="역할"
              value={form.referrerRole}
              onChange={(v) => patch('referrerRole', v)}
              options={['교사', '보호자', '본인', '친구', '외부기관', '기타']}
            />
            <Input
              label="의뢰인 연락처"
              value={form.referrerContact}
              onChange={(v) => patch('referrerContact', v)}
              type="tel"
            />
          </div>
        </Surface>
        <Surface className="surface wt-section">
          <h2>상담 정보</h2>
          <Text label="주호소 *" value={form.complaint} onChange={(v) => patch('complaint', v)} />
          <Text label="상담목표" value={form.goal} onChange={(v) => patch('goal', v)} />
          <Text
            label="교사의견"
            value={form.teacherOpinion}
            onChange={(v) => patch('teacherOpinion', v)}
          />
          <Text
            label="메모 · 사례 내부 참고용"
            value={form.notes}
            onChange={(v) => patch('notes', v)}
          />
        </Surface>
        {error && <p role="alert">{error}</p>}
        <div className="wt-actions">
          <Button type="button" variant="secondary" onClick={cancel}>
            취소
          </Button>
          <Button type="submit">{record ? '수정 저장' : '사례 등록'}</Button>
        </div>
      </form>
    </div>
  )
}
function CaseDetail({ record }: { record: CaseRecord }): React.JSX.Element {
  const { data, setData, navigate, notify } = useWorkspace()
  const [tab, setTab] = useState('개요'),
    [confirm, setConfirm] = useState(''),
    [reason, setReason] = useState('목표 달성'),
    [other, setOther] = useState('')
  const people = data.students.filter((s) => record.studentIds.includes(s.id))
  const sessions = data.sessions
    .filter((s) => s.caseId === record.id)
    .sort((a, b) => b.start.localeCompare(a.start))
  const commit = (): void => {
    if (confirm === '사례 삭제') {
      setData((d) => ({
        ...d,
        cases: d.cases.filter((c) => c.id !== record.id),
        sessions: d.sessions.filter((s) => s.caseId !== record.id)
      }))
      navigate('/cases')
      notify('사례와 연결된 상담 기록을 삭제했습니다.')
    } else {
      setData((d) => ({
        ...d,
        cases: d.cases.map((c) =>
          c.id === record.id
            ? {
                ...c,
                status: c.status === '진행' ? '종결' : '진행',
                closedAt: c.status === '진행' ? day() : '',
                closeReason: c.status === '진행' ? (reason === '기타' ? other : reason) : ''
              }
            : c
        )
      }))
      notify(record.status === '진행' ? '사례를 종결했습니다.' : '사례를 재개했습니다.')
    }
    setConfirm('')
  }
  return (
    <div className="wt-stack">
      <Back onClick={() => navigate('/cases')}>사례 목록으로</Back>
      <PageHeading
        title={people.map((s) => s.name).join(', ') || '사례 상세'}
        subtitle={`${record.number} · ${record.year}학년도 · ${record.createdAt} 등록`}
      >
        <Badge tone={record.status === '진행' ? 'blue' : 'gray'}>{record.status}</Badge>
        <Button variant="secondary" onClick={() => navigate(`/cases/${record.id}/edit`)}>
          <Pencil size={15} />
          사례 수정
        </Button>
        <Button onClick={() => navigate(`/cases/${record.id}/sessions/new`)}>
          <Plus size={15} />
          상담 기록 추가
        </Button>
      </PageHeading>
      <div className="wt-toolbar">
        <Button
          variant="ghost"
          onClick={() => setConfirm(record.status === '진행' ? '사례 종료' : '사례 재개')}
        >
          {record.status === '진행' ? '사례 종료' : '사례 재개'}
        </Button>
        <Button variant="ghost" onClick={() => setConfirm('사례 삭제')}>
          사례 삭제
        </Button>
        {record.status === '종결' && (
          <p>
            종결일 {record.closedAt} · {record.closeReason}
          </p>
        )}
      </div>
      <Tabs items={detailTabs} value={tab} onChange={setTab} />
      {tab === '개요' && (
        <>
          <Surface className="surface wt-section">
            <h2>내담자·보호자 정보</h2>
            <div className="wt-grid">
              {people.map((p) => {
                const e = p.enrollments.find((x) => x.year === record.year)
                return (
                  <div key={p.id} className="wt-card">
                    <Button variant="ghost" onClick={() => navigate(`/students/${p.id}`)}>
                      {p.name} <ArrowRight size={15} />
                    </Button>
                    <p>
                      {e ? `${e.grade}학년 ${e.classroom}반 ${e.number}번` : '학적 미입력'} ·{' '}
                      {p.gender}
                    </p>
                    <p>
                      보호자 {p.guardianName || '미입력'} · {p.guardianRelation || '관계 미입력'}
                    </p>
                    <p>{p.guardianContact || '연락처 미입력'}</p>
                  </div>
                )
              })}
            </div>
          </Surface>
          <Surface className="surface wt-section">
            <h2>사례 정보</h2>
            {[
              ['주호소', record.complaint],
              ['상담 목표', record.goal],
              ['교사 의견', record.teacherOpinion],
              ['메모', record.notes]
            ].map(([label, value]) => (
              <div key={label}>
                <h3>{label}</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{value || '미입력'}</p>
              </div>
            ))}
            <h3>의뢰 정보</h3>
            <p>
              {record.referrer || '미입력'} · {record.referrerRole} ·{' '}
              {record.referrerContact || '연락처 미입력'}
            </p>
          </Surface>
        </>
      )}
      {tab === '사례 개념화' && <Concepts record={record} />}{' '}
      {tab === '상담 기록' && (
        <Surface className="surface wt-section">
          <h2>상담 기록 ({sessions.length})</h2>
          {sessions.length ? (
            <Table className="wt-table">
              <TableHeader>
                <TableRow>
                  <TableHead>회차</TableHead>
                  <TableHead>일시</TableHead>
                  <TableHead>분류</TableHead>
                  <TableHead>나이스 상담제목</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell>{sessions.length - i}회</TableCell>
                    <TableCell>{s.start.replace('T', ' ')}</TableCell>
                    <TableCell>
                      {s.category} / {s.categoryMedium}
                    </TableCell>
                    <TableCell>{s.neisTitle || '(제목 없음)'}</TableCell>
                    <TableCell>{s.status}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        onClick={() => navigate(`/cases/${record.id}/sessions/${s.id}`)}
                      >
                        기록 보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty
              title="아직 상담 기록이 없습니다"
              action={
                <Button onClick={() => navigate(`/cases/${record.id}/sessions/new`)}>
                  첫 상담 기록 작성
                </Button>
              }
            />
          )}
        </Surface>
      )}
      {tab === '동의서' && <Consents record={record} />}{' '}
      {confirm && (
        <Modal title={`${confirm}하시겠습니까?`} onClose={() => setConfirm('')}>
          <p>
            {confirm === '사례 삭제'
              ? '이 사례와 연결된 모든 상담 기록이 현재 PoC에서 삭제됩니다.'
              : confirm === '사례 종료'
                ? '종료 사유를 기록합니다. 종료 후에도 기록을 볼 수 있고 사례를 다시 시작할 수 있습니다.'
                : '이 사례를 진행 상태로 되돌립니다.'}
          </p>
          {confirm === '사례 종료' && (
            <>
              <Select
                label="종료 사유"
                value={reason}
                onChange={setReason}
                options={['목표 달성', '학생 요청', '졸업', '전학', '외부기관 연계', '기타']}
              />
              {reason === '기타' && <Text label="기타 사유" value={other} onChange={setOther} />}
            </>
          )}
          <div className="wt-actions">
            <Button variant="secondary" onClick={() => setConfirm('')}>
              취소
            </Button>
            <Button
              disabled={confirm === '사례 종료' && reason === '기타' && !other.trim()}
              onClick={commit}
            >
              {confirm}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
function Concepts({ record }: { record: CaseRecord }): React.JSX.Element {
  const { data, setData, notify } = useWorkspace()
  const [draft, setDraft] = useState<Concept | null>(null),
    [view, setView] = useState<Concept | null>(null),
    [pick, setPick] = useState(false),
    [templateId, setTemplateId] = useState(data.templates[0]?.id || ''),
    [deleteId, setDeleteId] = useState(''),
    [custom, setCustom] = useState(false),
    [customName, setCustomName] = useState(''),
    [customFields, setCustomFields] = useState('')
  const template = data.templates.find((t) => t.id === templateId)
  const save = (): void => {
    if (!draft) return
    setData((d) => ({
      ...d,
      cases: d.cases.map((c) =>
        c.id === record.id
          ? {
              ...c,
              concepts: c.concepts.some((x) => x.id === draft.id)
                ? c.concepts.map((x) => (x.id === draft.id ? draft : x))
                : [...c.concepts, draft]
            }
          : c
      )
    }))
    setDraft(null)
    notify('사례개념화 문서를 저장했습니다.')
  }
  return (
    <div className="wt-stack">
      <div className="wt-toolbar">
        <h2>사례 개념화</h2>
        <Button variant="secondary" onClick={() => setCustom(true)}>
          내 양식 만들기
        </Button>
        <Button onClick={() => setPick(true)}>
          <Plus size={15} />새 문서
        </Button>
      </div>
      {record.concepts.length ? (
        <div className="wt-grid">
          {record.concepts.map((c) => (
            <div
              className="surface wt-card text-left transition-colors hover:border-primary/30"
              key={c.id}
            >
              <FileText size={24} />
              <h3>{c.title}</h3>
              <p>
                {c.template} · {c.date}
              </p>
              <div className="wt-actions">
                <Button variant="ghost" onClick={() => setView(c)}>
                  문서 보기
                </Button>
                <Button variant="ghost" onClick={() => setDraft({ ...c, fields: { ...c.fields } })}>
                  수정
                </Button>
                <Button variant="ghost" onClick={() => setDeleteId(c.id)}>
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="사례를 함께 이해하는 첫 문서"
          description="5P, CBT, 해결중심 등 양식을 미리 보고 선택하세요."
          action={<Button onClick={() => setPick(true)}>양식 선택하기</Button>}
        />
      )}{' '}
      {pick && (
        <Modal title="사례개념화 양식 선택" onClose={() => setPick(false)}>
          <div className="wt-grid">
            {data.templates.map((t) => (
              <label className="wt-choice" key={t.id}>
                <TextInput
                  type="radio"
                  name="template"
                  checked={templateId === t.id}
                  onChange={() => setTemplateId(t.id)}
                />
                {t.name}
              </label>
            ))}
          </div>
          <div className="wt-preview">
            <h3>{template?.name} 미리보기</h3>
            {template?.fields.map((f, i) => (
              <p key={i}>
                {i + 1}. {f}
              </p>
            ))}
          </div>
          <div className="wt-actions">
            <Button variant="secondary" onClick={() => setPick(false)}>
              취소
            </Button>
            <Button
              disabled={!template}
              onClick={() => {
                if (template)
                  setDraft({
                    id: uid(),
                    title: template.name,
                    template: template.name,
                    fields: Object.fromEntries(template.fields.map((f) => [f, ''])),
                    date: day()
                  })
                setPick(false)
              }}
            >
              이 양식으로 작성
            </Button>
          </div>
        </Modal>
      )}
      {draft && (
        <Modal title="사례개념화 작성" onClose={() => setDraft(null)}>
          <Input
            label="문서 제목"
            value={draft.title}
            onChange={(v) => setDraft({ ...draft, title: v })}
          />
          {Object.entries(draft.fields).map(([label, value]) => (
            <Text
              key={label}
              label={label}
              value={value}
              onChange={(v) => setDraft({ ...draft, fields: { ...draft.fields, [label]: v } })}
            />
          ))}
          <div className="wt-actions">
            <Button variant="secondary" onClick={() => setDraft(null)}>
              취소
            </Button>
            <Button disabled={!draft.title.trim()} onClick={save}>
              저장
            </Button>
          </div>
        </Modal>
      )}
      {view && (
        <Modal title={view.title} onClose={() => setView(null)}>
          <p>
            {view.template} · {view.date}
          </p>
          {Object.entries(view.fields).map(([label, value]) => (
            <section key={label}>
              <h3>{label}</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{value || '미입력'}</p>
            </section>
          ))}
          <div className="wt-actions">
            <Button
              variant="secondary"
              onClick={() =>
                download(
                  `${view.title}.txt`,
                  Object.entries(view.fields)
                    .map(([l, v]) => `${l}\n${v}`)
                    .join('\n\n')
                )
              }
            >
              텍스트 내보내기
            </Button>
            <Button
              onClick={() => {
                setDraft(view)
                setView(null)
              }}
            >
              수정
            </Button>
          </div>
        </Modal>
      )}
      {custom && (
        <Modal title="내 양식 만들기" onClose={() => setCustom(false)}>
          <Input label="양식 이름" value={customName} onChange={setCustomName} />
          <Text
            label="항목 이름 · 한 줄에 한 항목"
            value={customFields}
            onChange={setCustomFields}
          />
          <p className="wt-note">현재 화면 PoC에서는 텍스트 항목을 구성할 수 있습니다.</p>
          <Button
            disabled={!customName.trim() || !customFields.trim()}
            onClick={() => {
              setData((d) => ({
                ...d,
                templates: [
                  ...d.templates,
                  {
                    id: uid(),
                    name: customName.trim(),
                    fields: [
                      ...new Set(
                        customFields
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    ]
                  }
                ]
              }))
              setCustom(false)
              setCustomName('')
              setCustomFields('')
              notify('내 양식을 추가했습니다.')
            }}
          >
            양식 저장
          </Button>
        </Modal>
      )}
      {deleteId && (
        <Modal title="문서를 삭제하시겠습니까?" onClose={() => setDeleteId('')}>
          <p>선택한 사례개념화 문서가 삭제됩니다.</p>
          <div className="wt-actions">
            <Button variant="secondary" onClick={() => setDeleteId('')}>
              취소
            </Button>
            <Button
              onClick={() => {
                setData((d) => ({
                  ...d,
                  cases: d.cases.map((c) =>
                    c.id === record.id
                      ? { ...c, concepts: c.concepts.filter((x) => x.id !== deleteId) }
                      : c
                  )
                }))
                setDeleteId('')
              }}
            >
              삭제
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
function Consents({ record }: { record: CaseRecord }): React.JSX.Element {
  const { data, setData, notify } = useWorkspace()
  const [draft, setDraft] = useState<Consent | null>(null),
    [view, setView] = useState<Consent | null>(null),
    [log, setLog] = useState(false),
    [send, setSend] = useState(false),
    [channel, setChannel] = useState('링크 직접 전달(복사)'),
    [selected, setSelected] = useState<string[]>([])
  const pupils = data.students.filter((s) => record.studentIds.includes(s.id))
  return (
    <div className="wt-stack">
      <div className="wt-toolbar">
        <h2>동의서 목록</h2>
        <Button variant="secondary" onClick={() => setLog(true)}>
          처리 기록
        </Button>
        <Button variant="secondary" onClick={() => setSend(true)}>
          동의서 발송
        </Button>
        <Button
          onClick={() =>
            setDraft({
              id: uid(),
              title: '학생 상담 및 개인정보 수집·이용 동의서',
              studentId: pupils[0]?.id || '',
              status: '작성 중',
              date: day(),
              body: '상담 목적: 학생의 건강한 학교생활과 정서적 성장을 지원합니다.\n수집 항목: 학생 기본정보, 상담 기록, 보호자 연락처\n보유 기간: 학교 개인정보 처리 기준에 따릅니다.\n동의를 거부할 권리가 있으며, 상담 제공 범위가 제한될 수 있습니다.\n\n상담 참여 동의 □ 동의 □ 미동의\n개인정보 수집·이용 동의 □ 동의 □ 미동의\n보호자 성명:                 서명:'
            })
          }
        >
          새 동의서 작성
        </Button>
      </div>
      <p className="wt-note">
        화면 PoC입니다. 문서 작성과 전달 방법을 미리 볼 수 있으며 실제 링크 생성·SMS 발송·응답
        수집은 연결되지 않았습니다.
      </p>
      {record.consents.length ? (
        <div className="wt-grid">
          {record.consents.map((c) => (
            <div
              className="surface wt-card text-left transition-colors hover:border-primary/30"
              key={c.id}
            >
              <Badge tone="gray">{c.status}</Badge>
              <h3>{c.title}</h3>
              <p>
                {data.students.find((s) => s.id === c.studentId)?.name} · {c.date}
              </p>
              <Button variant="ghost" onClick={() => setView(c)}>
                동의서 보기
              </Button>
              <Button variant="ghost" onClick={() => setDraft({ ...c })}>
                수정
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="작성한 동의서가 없습니다"
          description="상담 참여와 개인정보 수집·이용 내용을 먼저 작성해 보세요."
        />
      )}
      {draft && (
        <Modal title="동의서 작성" onClose={() => setDraft(null)}>
          <Input
            label="문서 제목"
            value={draft.title}
            onChange={(v) => setDraft({ ...draft, title: v })}
          />
          <Field label="학생">
            <FormSelect
              value={draft.studentId}
              onValueChange={(e) => setDraft({ ...draft, studentId: e })}
            >
              {pupils.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </FormSelect>
          </Field>
          <Text
            label="동의서 내용"
            value={draft.body}
            rows={12}
            onChange={(v) => setDraft({ ...draft, body: v })}
          />
          <Button
            disabled={!draft.title.trim() || !draft.studentId || !draft.body.trim()}
            onClick={() => {
              setData((d) => ({
                ...d,
                cases: d.cases.map((c) =>
                  c.id === record.id
                    ? {
                        ...c,
                        consents: c.consents.some((x) => x.id === draft.id)
                          ? c.consents.map((x) => (x.id === draft.id ? draft : x))
                          : [...c.consents, draft]
                      }
                    : c
                )
              }))
              setDraft(null)
              notify('동의서 초안을 저장했습니다.')
            }}
          >
            초안 저장
          </Button>
        </Modal>
      )}
      {view && (
        <Modal title={view.title} onClose={() => setView(null)}>
          <p>학생: {data.students.find((s) => s.id === view.studentId)?.name}</p>
          <div className="wt-preview" style={{ whiteSpace: 'pre-wrap' }}>
            {view.body}
          </div>
          <p className="wt-note">서명·응답이 없는 초안입니다.</p>
          <Button onClick={() => download(`${view.title}.txt`, view.body)}>
            초안 텍스트 다운로드
          </Button>
        </Modal>
      )}
      {send && (
        <Modal title="동의서 발송 미리보기" onClose={() => setSend(false)}>
          <h3>동의서 선택 (여러 개 선택 가능)</h3>
          {record.consents.map((c) => (
            <label className="wt-choice" key={c.id}>
              <FormCheckbox
                checked={selected.includes(c.id)}
                onCheckedChange={(e) =>
                  setSelected((v) => (e ? [...v, c.id] : v.filter((id) => id !== c.id)))
                }
              />
              {c.title} · {pupils.find((s) => s.id === c.studentId)?.name}
            </label>
          ))}
          {!record.consents.length && <p>먼저 동의서 초안을 작성해 주세요.</p>}
          <Select
            label="전달 방법"
            value={channel}
            onChange={setChannel}
            options={['링크 직접 전달(복사)', '보호자에게 SMS 발송']}
          />
          <p className="wt-note">
            선택한 동의서 {selected.length}개 · 실제 발송 서버 미연결. 링크나 문자를 생성하지
            않습니다.
          </p>
          <Button variant="secondary" onClick={() => setSend(false)}>
            미리보기 닫기
          </Button>
        </Modal>
      )}
      {log && (
        <Modal title="동의서 처리 기록" onClose={() => setLog(false)}>
          {record.consents.length ? (
            record.consents.map((c) => (
              <p key={c.id}>
                {c.date} · {c.title} · 초안 작성
              </p>
            ))
          ) : (
            <p>기록된 이벤트가 없습니다.</p>
          )}
          <p className="wt-note">실제 발송 및 응답 기록은 없습니다.</p>
        </Modal>
      )}
    </div>
  )
}
function SessionPage({
  record,
  session,
  editing
}: {
  record: CaseRecord
  session?: Meeting
  editing: boolean
}): React.JSX.Element {
  const { data, setData, navigate, notify } = useWorkspace()
  const [remove, setRemove] = useState(false),
    [print, setPrint] = useState(false),
    [includeNeis, setIncludeNeis] = useState(true),
    [error, setError] = useState(''),
    [workspace, setWorkspace] = useState('상담 기록')
  const [draft, setDraft] = useState<Meeting>(
    session ?? {
      id: uid(),
      schoolId: record.schoolId,
      caseId: record.id,
      studentIds: [...record.studentIds],
      title: '',
      start: `${day()}T09:00`,
      end: `${day()}T09:40`,
      allDay: false,
      category: '개인상담',
      categoryMedium: '학교생활',
      categoryDetail: '일반 상담',
      counselingClass: '상담',
      weeClass: data.schools.find((s) => s.id === record.schoolId)?.weeClass || 'Wee클래스',
      medium: '대면',
      target: '학생',
      crisis: '해당 없음',
      counselorAffiliation: '학교',
      neisTitle: '학생 개인상담',
      neisContent: '학생의 학교생활에 관한 개인상담',
      internalNotes: '',
      status: '완료',
      reminder: 10,
      color: '#3196ff',
      location: '상담실'
    }
  )
  const patch = (key: keyof Meeting, value: string | number | boolean): void =>
    setDraft((d) => ({ ...d, [key]: value }))
  const people = data.students.filter((s) => record.studentIds.includes(s.id))
  const base = `/cases/${record.id}`
  const duration = Math.max(
    0,
    Math.round((new Date(draft.end).getTime() - new Date(draft.start).getTime()) / 60000)
  )
  const computedYear =
    Number(draft.start.slice(0, 4)) - (Number(draft.start.slice(5, 7)) < 3 ? 1 : 0)
  const save = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!draft.studentIds.length && draft.category !== '연구') {
      setError('연구 분류를 제외한 상담은 참여 학생을 한 명 이상 선택해야 합니다.')
      return
    }
    if (!draft.start || !draft.end || new Date(draft.end) <= new Date(draft.start)) {
      setError('상담 시작·종료 시간을 확인해 주세요.')
      return
    }
    setData((d) => ({
      ...d,
      sessions: session
        ? d.sessions.map((s) =>
            s.id === draft.id ? { ...draft, title: draft.neisTitle || draft.category } : s
          )
        : [...d.sessions, { ...draft, title: draft.neisTitle || draft.category }]
    }))
    notify('상담 기록을 저장했습니다.')
    navigate(`${base}/sessions/${draft.id}`)
  }
  return (
    <div className="wt-stack">
      <Back onClick={() => navigate(base)}>사례로 돌아가기</Back>
      <PageHeading
        title={editing ? (session ? '상담 기록 수정' : '새 상담 기록') : '상담 상세'}
        subtitle={`${record.number} · ${people.map((s) => s.name).join(', ')}`}
      >
        {!editing && (
          <>
            <Button variant="secondary" onClick={() => setPrint(true)}>
              인쇄 미리보기
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`${base}/sessions/${session?.id}/edit`)}
            >
              수정
            </Button>
            <Button variant="ghost" onClick={() => setRemove(true)}>
              삭제
            </Button>
          </>
        )}
      </PageHeading>
      <form className="wt-stack" onSubmit={save}>
        <Surface className="surface wt-section">
          <h2>참여자</h2>
          <p className="wt-note">참여 학생의 인원·학년·성별이 나이스 엑셀에 반영됩니다.</p>
          {editing && (
            <div className="wt-toolbar">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDraft((d) => ({ ...d, studentIds: people.map((p) => p.id) }))}
              >
                전체 선택
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDraft((d) => ({ ...d, studentIds: [] }))}
              >
                전체 해제
              </Button>
            </div>
          )}
          <div className="wt-grid">
            {people.map((s) => (
              <label className="wt-choice" key={s.id}>
                <FormCheckbox
                  disabled={!editing}
                  checked={draft.studentIds.includes(s.id)}
                  onCheckedChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      studentIds: e
                        ? [...d.studentIds, s.id]
                        : d.studentIds.filter((id) => id !== s.id)
                    }))
                  }
                />
                {s.name} · {s.gender}
              </label>
            ))}
          </div>
          <p>
            참여 {draft.studentIds.length}명 · {computedYear}학년도
          </p>
        </Surface>
        <Surface className="surface wt-section">
          <h2>상담 분류·조건</h2>
          <fieldset disabled={!editing} className="form-grid">
            <Select
              label="대분류 *"
              value={draft.category}
              onChange={(v) => patch('category', v)}
              options={CATEGORIES}
            />
            <Select
              label="중분류 *"
              value={draft.categoryMedium}
              onChange={(v) => patch('categoryMedium', v)}
              options={TOPICS}
            />
            <Select
              label="소분류 *"
              value={draft.categoryDetail}
              onChange={(v) => patch('categoryDetail', v)}
              options={[
                '일반 상담',
                '초기 면접',
                '추수 상담',
                '심리검사 실시',
                '심리검사 해석',
                '학업 상담',
                '진로 상담',
                '위기 개입',
                '보호자 상담',
                '교사 자문',
                '연구 활동',
                '기타'
              ]}
            />
            <Select
              label="상담매체구분"
              value={draft.medium}
              onChange={(v) => patch('medium', v)}
              options={['대면', '전화', '온라인', '서신', '기타']}
            />
            <Select
              label="상담대상"
              value={draft.target}
              onChange={(v) => patch('target', v)}
              options={['학생', '보호자', '교사', '기타']}
            />
            <Select
              label="위기유형 (해당 시)"
              value={draft.crisis}
              onChange={(v) => patch('crisis', v)}
              options={['해당 없음', '자살·자해', '학교폭력', '아동학대', '정서·행동', '기타']}
            />
            <Select
              label="상담분류 *"
              value={draft.counselingClass}
              onChange={(v) => patch('counselingClass', v)}
              options={['상담', '검사', '교육', '자문', '연구', '기타']}
            />
            <Select
              label="상담사소속 *"
              value={draft.counselorAffiliation}
              onChange={(v) => patch('counselorAffiliation', v)}
              options={['학교', 'Wee센터', 'Wee스쿨', '외부기관', '기타']}
            />
            <Select
              label="Wee설치여부 *"
              value={draft.weeClass}
              onChange={(v) => patch('weeClass', v)}
              options={['Wee클래스', 'Wee센터', 'Wee스쿨', '미설치']}
            />
          </fieldset>
        </Surface>
        <Surface className="surface wt-section">
          <h2>일시</h2>
          <fieldset disabled={!editing} className="wt-form-fields">
            <div className="form-grid">
              <Input
                label="상담 시작 *"
                type="datetime-local"
                value={draft.start.slice(0, 16)}
                onChange={(v) => patch('start', v)}
              />
              <Input
                label="상담 종료 *"
                type="datetime-local"
                value={draft.end.slice(0, 16)}
                onChange={(v) => patch('end', v)}
              />
              <Field label="학년도">
                <TextInput
                  value={Number.isFinite(computedYear) ? `${computedYear}학년도` : ''}
                  readOnly
                />
              </Field>
              <Field label="소요시간">
                <TextInput value={`${Number.isFinite(duration) ? duration : 0}분`} readOnly />
              </Field>
              <Select
                label="리마인더"
                value={String(draft.reminder)}
                onChange={(v) => patch('reminder', Number(v))}
                options={['0', '5', '10', '30', '60', '1440']}
              />
              <Select
                label="상태"
                value={draft.status}
                onChange={(v) => patch('status', v)}
                options={['예정', '완료']}
              />
            </div>
            <p className="wt-muted">
              리마인더는 시작 몇 분 전인지 선택합니다. 0은 없음, 1440은 하루 전입니다. 화면
              PoC에서는 알림이 발송되지 않습니다.
            </p>
            {editing && (
              <div className="wt-toolbar">
                {data.settings.timetable.map((t) => (
                  <Button
                    key={t.name}
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        start: `${d.start.slice(0, 10)}T${t.start}`,
                        end: `${d.start.slice(0, 10)}T${t.end}`
                      }))
                    }
                  >
                    {t.name} {t.start}
                  </Button>
                ))}
              </div>
            )}
          </fieldset>
        </Surface>
        <Surface className="surface wt-section">
          <h2>나이스 상담제목·내용</h2>
          <p className="wt-note">
            나이스 업로드용 문구입니다. 저장만으로 나이스에 등록되지는 않습니다. 민감한 상담
            기록이나 축어록 전문을 넣지 마세요.
          </p>
          <fieldset disabled={!editing} className="wt-form-fields">
            <Input
              label="상담제목"
              value={draft.neisTitle}
              onChange={(v) => patch('neisTitle', v)}
            />
            <Text
              label="상담내용"
              value={draft.neisContent}
              onChange={(v) => patch('neisContent', v)}
            />
          </fieldset>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  neisTitle: `${d.categoryMedium} ${d.category}`,
                  neisContent: `${d.start.slice(0, 10)} ${d.studentIds.length}명을 대상으로 ${d.categoryMedium} 관련 ${d.category} 실시.`
                }))
              }
            >
              분류·참여자에 맞는 기본 문구로 되돌리기
            </Button>
          )}
        </Surface>
        <Surface className="surface wt-section">
          <Tabs items={['상담 기록', '참고 정보']} value={workspace} onChange={setWorkspace} />
          {workspace === '상담 기록' ? (
            <>
              <p className="wt-note">
                상담의 실제 내용과 다음 회기 계획을 기록합니다. 나이스 엑셀에는 포함되지 않습니다.
              </p>
              <fieldset disabled={!editing} className="wt-form-fields">
                <Text
                  label="상담 기록 · 내부 기록"
                  rows={10}
                  value={draft.internalNotes}
                  onChange={(v) => patch('internalNotes', v)}
                />
              </fieldset>
            </>
          ) : (
            <>
              <p>학생과 나눈 이야기, 관찰한 반응, 개입, 다음 회기 계획을 구분하여 작성합니다.</p>
              <p>이 화면 PoC에는 AI 정리·음성 인식 기능이 포함되지 않습니다.</p>
            </>
          )}
        </Surface>
        {error && <p role="alert">{error}</p>}
        {editing && (
          <div className="wt-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(session ? `${base}/sessions/${session.id}` : base)}
            >
              취소
            </Button>
            <Button type="submit">{session ? '수정 저장' : '상담 기록 등록'}</Button>
          </div>
        )}
      </form>
      {remove && (
        <Modal title="상담 기록을 삭제하시겠습니까?" onClose={() => setRemove(false)}>
          <p>선택한 상담 기록을 현재 PoC에서 삭제합니다.</p>
          <div className="wt-actions">
            <Button variant="secondary" onClick={() => setRemove(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== session?.id) }))
                navigate(base)
                notify('상담 기록을 삭제했습니다.')
              }}
            >
              삭제
            </Button>
          </div>
        </Modal>
      )}
      {print && (
        <Modal title="상담 기록 인쇄 미리보기" onClose={() => setPrint(false)}>
          <label className="wt-choice">
            <FormCheckbox checked={includeNeis} onCheckedChange={(e) => setIncludeNeis(e)} />
            나이스 상담제목·내용 포함
          </label>
          <article className="wt-preview">
            <h2>상담 기록</h2>
            <p>
              {record.number} · {draft.start.replace('T', ' ')} · {duration}분
            </p>
            <p>
              {people
                .filter((p) => draft.studentIds.includes(p.id))
                .map((p) => p.name)
                .join(', ')}
            </p>
            <p>
              {draft.category} / {draft.categoryMedium} / {draft.categoryDetail}
            </p>
            {includeNeis && (
              <>
                <h3>{draft.neisTitle}</h3>
                <p>{draft.neisContent}</p>
              </>
            )}
            <h3>상담 기록</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{draft.internalNotes || '미입력'}</p>
          </article>
          <Button
            variant="secondary"
            onClick={() =>
              download(
                `상담기록-${draft.start.slice(0, 10)}.txt`,
                `${record.number}\n${draft.start}\n${includeNeis ? `${draft.neisTitle}\n${draft.neisContent}\n` : ''}\n상담 기록\n${draft.internalNotes}`
              )
            }
          >
            미리보기 텍스트 저장
          </Button>
        </Modal>
      )}
    </div>
  )
}
function Numbers(): React.JSX.Element {
  const { data, setData, path, navigate, notify } = useWorkspace()
  const tab = path.endsWith('/settings')
    ? '자동 사례번호 설정'
    : path.endsWith('/history')
      ? '변경 이력'
      : '사례번호 정리'
  const records = data.cases.filter(
    (c) => c.schoolId === data.activeSchoolId && c.year === data.settings.schoolYear
  )
  const [edits, setEdits] = useState<Record<string, string>>({}),
    [selected, setSelected] = useState<string[]>([]),
    [prefix, setPrefix] = useState(`${data.settings.schoolYear}-`),
    [digits, setDigits] = useState('3'),
    [start, setStart] = useState('1'),
    [retro, setRetro] = useState(false),
    [preview, setPreview] = useState(false),
    [error, setError] = useState(''),
    [historyId, setHistoryId] = useState('')
  const changes = records.filter((c) => edits[c.id] !== undefined && edits[c.id] !== c.number)
  const example = `${prefix}${String(Number(start) || 1).padStart(Number(digits), '0')}`
  const prepare = (): void => {
    const vals = records.map((c) => edits[c.id] ?? c.number)
    if (vals.some((v) => !v.trim()) || new Set(vals).size !== vals.length) {
      setError('사례번호가 비어 있거나 중복되어 있습니다.')
      return
    }
    setError('')
    setPreview(true)
  }
  const apply = (): void => {
    const proposed = data.cases
      .filter((c) => c.schoolId === data.activeSchoolId)
      .map((c) => edits[c.id] ?? c.number)
    if (
      proposed.some((v) => !v.trim() || v.length > 100) ||
      new Set(proposed).size !== proposed.length
    ) {
      setPreview(false)
      setError('사례번호가 비어 있거나 중복되어 있습니다. 변경 번호를 확인해 주세요.')
      return
    }
    const before = Object.fromEntries(changes.map((c) => [c.id, c.number])),
      after = Object.fromEntries(changes.map((c) => [c.id, edits[c.id]]))
    setData((d) => ({
      ...d,
      cases: d.cases.map((c) => (after[c.id] ? { ...c, number: after[c.id] } : c)),
      numberPattern:
        tab === '자동 사례번호 설정'
          ? `${prefix}[${digits}자리] 시작 ${Math.max(1, Number(start) || 1)}`
          : d.numberPattern,
      numberHistory: changes.length
        ? [
            {
              id: uid(),
              date: new Date().toLocaleString('ko-KR'),
              description:
                tab === '자동 사례번호 설정' ? '자동 번호 설정 및 기존 번호 변경' : '사례번호 변경',
              before,
              after
            },
            ...d.numberHistory
          ]
        : d.numberHistory
    }))
    setPreview(false)
    setEdits({})
    notify('번호 설정을 화면 PoC에 적용했습니다.')
  }
  const history = data.numberHistory.find((h) => h.id === historyId)
  return (
    <div className="wt-stack">
      <Back onClick={() => navigate('/cases')}>사례 관리로</Back>
      <PageHeading
        title="사례번호 관리"
        subtitle={`${data.settings.schoolYear}학년도 · 번호 변경 내용을 먼저 확인합니다.`}
      />
      <Tabs
        items={['사례번호 정리', '자동 사례번호 설정', '변경 이력']}
        value={tab}
        onChange={(v) =>
          navigate(
            v === '사례번호 정리'
              ? '/cases/numbers'
              : v === '자동 사례번호 설정'
                ? '/cases/numbers/settings'
                : '/cases/numbers/history'
          )
        }
      />
      {tab === '사례번호 정리' && (
        <>
          <Surface className="surface wt-section">
            <div className="wt-toolbar">
              <Input label="일괄 번호 접두사" value={prefix} onChange={setPrefix} />
              <Input label="시작 번호" type="number" value={start} onChange={setStart} />
              <Select
                label="자릿수"
                value={digits}
                onChange={setDigits}
                options={['1', '2', '3', '4', '5', '6']}
              />
              <Button
                variant="secondary"
                disabled={!selected.length}
                onClick={() =>
                  setEdits(
                    Object.fromEntries(
                      selected.map((id, i) => [
                        id,
                        `${prefix}${String((Number(start) || 1) + i).padStart(Number(digits), '0')}`
                      ])
                    )
                  )
                }
              >
                선택 사례에 채우기
              </Button>
            </div>
            <Table className="wt-table">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <FormCheckbox
                      aria-label="모든 사례 선택"

                      checked={selected.length === records.length && records.length > 0}
                      onCheckedChange={(e) => setSelected(e ? records.map((c) => c.id) : [])}
                    />
                  </TableHead>
                  <TableHead>학생</TableHead>
                  <TableHead>현재 번호</TableHead>
                  <TableHead>변경 번호</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <FormCheckbox
                        aria-label={`${c.number} 선택`}

                        checked={selected.includes(c.id)}
                        onCheckedChange={(e) =>
                          setSelected((s) => (e ? [...s, c.id] : s.filter((id) => id !== c.id)))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {data.students
                        .filter((p) => c.studentIds.includes(p.id))
                        .map((p) => p.name)
                        .join(', ')}
                    </TableCell>
                    <TableCell>{c.number}</TableCell>
                    <TableCell>
                      <TextInput
                        aria-label={`${c.number} 변경 번호`}
                        value={edits[c.id] ?? c.number}
                        onChange={(e) => setEdits((s) => ({ ...s, [c.id]: e.target.value }))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="wt-actions">
              <Button variant="secondary" onClick={() => setEdits({})}>
                변경 취소
              </Button>
              <Button disabled={!changes.length} onClick={prepare}>
                {changes.length}개 변경 미리보기
              </Button>
            </div>
          </Surface>
        </>
      )}
      {tab === '자동 사례번호 설정' && (
        <Surface className="surface wt-section">
          <h2>새 사례의 자동 번호 규칙</h2>
          <p>현재 규칙: {data.numberPattern}</p>
          <div className="form-grid">
            <Input label="접두사" value={prefix} onChange={setPrefix} />
            <Select
              label="숫자 자릿수"
              value={digits}
              onChange={setDigits}
              options={['1', '2', '3', '4', '5', '6']}
            />
            <Input label="다음 순번" value={start} type="number" onChange={setStart} />
          </div>
          <p className="wt-preview">
            다음 번호 미리보기 <strong>{example}</strong>
          </p>
          <label className="wt-choice">
            <FormCheckbox checked={retro} onCheckedChange={(e) => setRetro(e)} />
            현재 학년도 기존 사례도 같은 접두사로 바꾸기
          </label>
          <p className="wt-note">
            화면 PoC에서는 규칙과 변경 미리보기 흐름을 제공합니다. 원본의 백업·번호 충돌 잠금은 로컬
            DB 연결 단계에서 적용합니다.
          </p>
          <Button
            onClick={() => {
              setEdits(
                retro
                  ? Object.fromEntries(
                      records.map((c, i) => [
                        c.id,
                        `${prefix}${String((Number(start) || 1) + i).padStart(Number(digits), '0')}`
                      ])
                    )
                  : {}
              )
              setPreview(true)
            }}
          >
            변경 내용 확인
          </Button>
        </Surface>
      )}
      {tab === '변경 이력' && (
        <Surface className="surface wt-section">
          <div className="wt-toolbar">
            <h2>사례번호 변경 이력</h2>
            <Button
              variant="secondary"
              disabled={!data.numberHistory.length}
              onClick={() =>
                download(
                  '사례번호-변경이력.csv',
                  '\uFEFF일시,작업,사례ID,이전번호,변경번호\n' +
                    data.numberHistory
                      .flatMap((h) =>
                        Object.keys(h.after).map((id) =>
                          [h.date, h.description, id, h.before[id], h.after[id]]
                            .map((v) => `"${v.replaceAll('"', '""')}"`)
                            .join(',')
                        )
                      )
                      .join('\n'),
                  'text/csv;charset=utf-8'
                )
              }
            >
              <Download size={16} />
              CSV 저장
            </Button>
          </div>
          {data.numberHistory.length ? (
            <Table className="wt-table">
              <TableHeader>
                <TableRow>
                  <TableHead>일시</TableHead>
                  <TableHead>작업</TableHead>
                  <TableHead>변경 건수</TableHead>
                  <TableHead>상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.numberHistory.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.date}</TableCell>
                    <TableCell>{h.description}</TableCell>
                    <TableCell>{Object.keys(h.after).length}건</TableCell>
                    <TableCell>
                      <Button variant="ghost" onClick={() => setHistoryId(h.id)}>
                        상세 보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty title="아직 번호 변경 이력이 없습니다" />
          )}
        </Surface>
      )}
      {error && <p role="alert">{error}</p>}
      {preview && (
        <Modal title="사례번호 변경 미리보기" onClose={() => setPreview(false)}>
          {tab === '자동 사례번호 설정' && <p>새 번호 예시: {example}</p>}
          <Table className="wt-table">
            <TableHeader>
              <TableRow>
                <TableHead>현재 번호</TableHead>
                <TableHead>변경 번호</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.number}</TableCell>
                  <TableCell>{edits[c.id]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p>{changes.length}개 기존 사례가 변경됩니다.</p>
          <div className="wt-actions">
            <Button variant="secondary" onClick={() => setPreview(false)}>
              계속 수정
            </Button>
            <Button onClick={apply}>적용</Button>
          </div>
        </Modal>
      )}
      {history && (
        <Modal title="번호 변경 이력 상세" onClose={() => setHistoryId('')}>
          <p>
            {history.date} · {history.description}
          </p>
          {Object.keys(history.after).map((id) => (
            <p key={id}>
              {history.before[id]} → {history.after[id]}
            </p>
          ))}
          <Button
            variant="secondary"
            disabled={Object.keys(history.after).some(
              (id) => data.cases.find((c) => c.id === id)?.number !== history.after[id]
            )}
            onClick={() => {
              setData((d) => ({
                ...d,
                cases: d.cases.map((c) =>
                  history.before[c.id] ? { ...c, number: history.before[c.id] } : c
                ),
                numberHistory: [
                  {
                    id: uid(),
                    date: new Date().toLocaleString('ko-KR'),
                    description: '이전 번호로 되돌리기',
                    before: history.after,
                    after: history.before
                  },
                  ...d.numberHistory
                ]
              }))
              setHistoryId('')
              notify('이전 번호로 되돌렸습니다.')
            }}
          >
            이전 번호로 되돌리기
          </Button>
          <p className="wt-note">
            이후 다른 번호로 바뀌었거나 삭제된 사례가 있으면 되돌릴 수 없습니다.
          </p>
        </Modal>
      )}
    </div>
  )
}
function NeisImport(): React.JSX.Element {
  const { data, setData, navigate, notify } = useWorkspace()
  const [step, setStep] = useState(0),
    [file, setFile] = useState(''),
    [selectedCase, setSelectedCase] = useState(''),
    [text, setText] = useState(''),
    [error, setError] = useState('')
  const rows = text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [date, title, content] = line.split('\t')
      return { date, title, content }
    })
  const records = data.cases.filter(
    (c) => c.schoolId === data.activeSchoolId && c.year === data.settings.schoolYear
  )
  return (
    <div className="wt-stack">
      <Back onClick={() => navigate('/cases')}>사례 관리로</Back>
      <PageHeading
        title="나이스 상담일지 가져오기"
        subtitle="자료 선택 → 사례 연결 → 내용 검토 → 가져오기"
      />
      <Tabs
        items={['1. 자료 선택', '2. 사례 연결', '3. 내용 검토']}
        value={['1. 자료 선택', '2. 사례 연결', '3. 내용 검토'][step]}
        onChange={(v) => {
          const n = ['1. 자료 선택', '2. 사례 연결', '3. 내용 검토'].indexOf(v)
          if (n <= step) setStep(n)
        }}
      />
      <p className="wt-note">
        화면 PoC: 원본 엑셀 자동 분석은 연결 전입니다. 파일 선택을 미리 보고, 아래 표 데이터를 붙여
        넣어 가져오기 흐름을 체험할 수 있습니다.
      </p>
      {step === 0 && (
        <Surface className="surface wt-section">
          <h2>나이스 상담일지 선택</h2>
          <Field label="엑셀 파일 (선택 미리보기)">
            <TextInput
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0]?.name || '')}
            />
          </Field>
          {file && <p>{file} · 자동 분석은 아직 연결되지 않았습니다.</p>}
          <Text
            label="날짜 · 상담제목 · 상담내용을 탭으로 구분하여 붙여넣기"
            rows={10}
            value={text}
            onChange={setText}
          />
          <Button
            variant="secondary"
            onClick={() =>
              setText(
                `${day()}\t학생 개인상담\t학교생활 적응에 관한 상담\n${day()}\t학생 추수상담\t이전 상담 이후의 변화를 확인함`
              )
            }
          >
            예시 데이터 넣기
          </Button>
          <Button
            disabled={!text.trim()}
            onClick={() => {
              if (rows.some((r) => !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !r.title)) {
                setError('각 행에 YYYY-MM-DD 날짜와 상담제목을 탭으로 구분해 입력해 주세요.')
                return
              }
              setError('')
              setStep(1)
            }}
          >
            사례 연결
          </Button>
        </Surface>
      )}
      {step === 1 && (
        <Surface className="surface wt-section">
          <h2>상담 기록을 연결할 사례</h2>
          <Field label="기존 사례">
            <FormSelect value={selectedCase} onValueChange={(e) => setSelectedCase(e)}>
              <option value="">사례를 선택하세요</option>
              {records.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.number} ·{' '}
                  {data.students
                    .filter((p) => c.studentIds.includes(p.id))
                    .map((p) => p.name)
                    .join(', ')}
                </option>
              ))}
            </FormSelect>
          </Field>
          <p>{rows.length}개 상담 기록을 선택한 사례에 연결합니다.</p>
          <Button variant="secondary" onClick={() => navigate('/cases/new')}>
            새 사례 등록 화면 열기
          </Button>
          <Button disabled={!selectedCase} onClick={() => setStep(2)}>
            내용 검토
          </Button>
        </Surface>
      )}
      {step === 2 && (
        <Surface className="surface wt-section">
          <h2>가져오기 전 확인</h2>
          <Table className="wt-table">
            <TableHeader>
              <TableRow>
                <TableHead>상담일자</TableHead>
                <TableHead>나이스 상담제목</TableHead>
                <TableHead>나이스 상담내용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>{r.content}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="wt-note">
            내부 상담 기록은 비워 두며, 붙여 넣은 내용은 나이스 제목·내용에만 저장합니다.
          </p>
          <div className="wt-actions">
            <Button variant="secondary" onClick={() => setStep(1)}>
              이전
            </Button>
            <Button
              onClick={() => {
                const c = records.find((c) => c.id === selectedCase)
                if (!c) return
                const imported: Meeting[] = rows.map((r) => ({
                  id: uid(),
                  schoolId: c.schoolId,
                  caseId: c.id,
                  studentIds: c.studentIds,
                  title: r.title,
                  start: `${r.date}T09:00`,
                  end: `${r.date}T09:40`,
                  allDay: false,
                  category: '개인상담',
                  categoryMedium: '학교생활',
                  categoryDetail: '일반 상담',
                  counselingClass: '상담',
                  weeClass: 'Wee클래스',
                  medium: '대면',
                  target: '학생',
                  crisis: '해당 없음',
                  counselorAffiliation: '학교',
                  neisTitle: r.title,
                  neisContent: r.content || '',
                  internalNotes: '',
                  status: '완료',
                  reminder: 0,
                  color: '#3196ff',
                  location: '상담실'
                }))
                setData((d) => ({ ...d, sessions: [...d.sessions, ...imported] }))
                notify(`${rows.length}개 기록을 화면 PoC에 가져왔습니다.`)
                navigate(`/cases/${c.id}`)
              }}
            >
              {rows.length}개 기록 가져오기
            </Button>
          </div>
        </Surface>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
export function CasesPage(): React.JSX.Element {
  const { data, path, navigate } = useWorkspace()
  const parts = path.split(/[?#]/)[0].split('/').filter(Boolean)
  if (parts[1] === 'numbers') return <Numbers key={path} />
  if (parts[1] === 'new' && parts[2] === 'neis-import') return <NeisImport />
  if (parts[1] === 'new') return <CaseForm key={path} />
  if (!parts[1]) return <CaseList key={path} />
  const record = data.cases.find((c) => c.id === parts[1] && c.schoolId === data.activeSchoolId)
  if (!record)
    return (
      <Empty
        title="사례를 찾을 수 없습니다"
        action={<Button onClick={() => navigate('/cases')}>사례 목록으로</Button>}
      />
    )
  if (parts[2] === 'edit') return <CaseForm key={path} record={record} />
  if (parts[2] === 'sessions') {
    const isNew = parts[3] === 'new'
    const session = data.sessions.find((s) => s.id === parts[3] && s.caseId === record.id)
    if (!isNew && !session)
      return (
        <Empty
          title="상담 기록을 찾을 수 없습니다"
          action={<Button onClick={() => navigate(`/cases/${record.id}`)}>사례로 돌아가기</Button>}
        />
      )
    return (
      <SessionPage
        key={path}
        record={record}
        session={session}
        editing={isNew || parts[4] === 'edit'}
      />
    )
  }
  return <CaseDetail key={record.id} record={record} />
}
