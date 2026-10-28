import { toast } from '../lib/toast'
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
import { FormSelect, FormCheckbox } from '../components/form-controls'
import { useState } from 'react'
import { Plus, Upload, Pencil, Trash2, ChevronRight, Users } from 'lucide-react'
import { useWorkspace } from './context'
import { uid, type Pupil, type Enrollment } from './model'
import { Button, Field, Modal, Empty, PageHeading, Badge, Back } from './ui'

const enrollmentLabel = (e?: Enrollment): string =>
  e ? `${e.grade || '미입력'}학년 ${e.classroom || '-'}반 ${e.number || '-'}번` : '학적 미등록'
function EnrollmentFields({
  value,
  onChange
}: {
  value: Enrollment
  onChange: (value: Enrollment) => void
}): React.JSX.Element {
  return (
    <div className="form-grid">
      <Field label="학년도">
        <TextInput
          required
          type="number"
          min="2000"
          max="2100"
          value={value.year}
          onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
        />
      </Field>
      <Field label="학년">
        <FormSelect
          value={value.grade}
          onValueChange={(e) => onChange({ ...value, grade: Number(e) })}
        >
          <option value={0}>미입력</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}학년
            </option>
          ))}
        </FormSelect>
      </Field>
      <Field label="반 이름">
        <TextInput
          value={value.classroom}
          placeholder="예: 3, 가, 사랑"
          onChange={(e) => onChange({ ...value, classroom: e.target.value })}
        />
      </Field>
      <Field label="번호">
        <TextInput
          type="number"
          min="0"
          value={value.number || ''}
          onChange={(e) => onChange({ ...value, number: Number(e.target.value) })}
        />
      </Field>
      <Field label="재학 상태">
        <FormSelect
          value={value.status}
          onValueChange={(e) => onChange({ ...value, status: e as Enrollment['status'] })}
        >
          {['재학', '졸업', '전출'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </FormSelect>
      </Field>
    </div>
  )
}
function StudentEditor({
  student,
  onClose
}: {
  student: Pupil | null
  onClose: () => void
}): React.JSX.Element {
  const { data, setData, notify } = useWorkspace(),
    year = data.settings.schoolYear
  const [draft, setDraft] = useState<Pupil>(
    student
      ? structuredClone(student)
      : {
          id: uid(),
          schoolId: data.activeSchoolId,
          name: '',
          gender: '미입력',
          contact: '',
          guardianName: '',
          guardianRelation: '',
          guardianContact: '',
          enrollments: []
        }
  )
  const [enrollment, setEnrollment] = useState<Enrollment>(
    student?.enrollments.find((e) => e.year === year) || {
      year,
      grade: 0,
      classroom: '',
      number: 0,
      status: '재학'
    }
  )
  const textField = (
    label: string,
    key: 'name' | 'contact' | 'guardianName' | 'guardianRelation' | 'guardianContact'
  ): React.JSX.Element => (
    <Field label={label}>
      <TextInput
        required={key === 'name'}
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      />
    </Field>
  )
  return (
    <Modal
      title={student ? '학생 정보 수정' : '학생 등록'}
      subtitle="학생의 기본 정보와 학년도별 학적을 입력합니다."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.name.trim()) return
          const next = {
            ...draft,
            name: draft.name.trim(),
            enrollments: [
              ...draft.enrollments.filter((item) => item.year !== enrollment.year),
              enrollment
            ]
          }
          setData((d) => ({
            ...d,
            students: student
              ? d.students.map((s) => (s.id === next.id ? next : s))
              : [...d.students, next]
          }))
          notify(student ? '학생 정보가 수정되었습니다.' : '학생이 등록되었습니다.')
          onClose()
        }}
      >
        <div className="form-grid">
          {textField('이름 *', 'name')}
          <Field label="성별">
            <FormSelect
              value={draft.gender}
              onValueChange={(e) => setDraft({ ...draft, gender: e as Pupil['gender'] })}
            >
              {['미입력', '남', '여'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </FormSelect>
          </Field>
          {textField('학생 연락처', 'contact')}
          {textField('보호자 이름', 'guardianName')}
          {textField('보호자 관계', 'guardianRelation')}
          {textField('보호자 연락처', 'guardianContact')}
        </div>
        <h3>학년도별 학적</h3>
        <EnrollmentFields value={enrollment} onChange={setEnrollment} />
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">저장</Button>
        </div>
      </form>
    </Modal>
  )
}
interface UploadRow {
  name: string
  grade: number
  classroom: string
  number: number
  gender: Pupil['gender']
  link: string
  reviewed: boolean
}
function RosterUpload({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { data, setData, notify } = useWorkspace()
  const [step, setStep] = useState(0),
    [year, setYear] = useState(data.settings.schoolYear),
    [text, setText] = useState(''),
    [rows, setRows] = useState<UploadRow[]>([]),
    [graduates, setGraduates] = useState<string[]>([])
  const pupils = data.students.filter((s) => s.schoolId === data.activeSchoolId)
  const update = (index: number, patch: Partial<UploadRow>): void =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const parse = (): void => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean)
    const parsed = lines
      .filter((l) => !/^성명|^이름/.test(l))
      .map((line) => {
        const [name, grade, classroom, number, gender] = line.split(/[,\t]/).map((s) => s.trim())
        const match = pupils.find((s) => s.name === name)
        return {
          name: name || '',
          grade: Number(grade) || 0,
          classroom: classroom || '',
          number: Number(number) || 0,
          gender:
            gender === '남'
              ? ('남' as const)
              : gender === '여'
                ? ('여' as const)
                : ('미입력' as const),
          link: match?.id || '',
          reviewed: false
        }
      })
    if (!parsed.length) {
      toast.warn('가져올 학생 정보를 입력해 주세요.')
      return
    }
    setRows(parsed)

    setStep(1)
  }
  const invalid =
    rows.some(
      (r) =>
        !r.name.trim() || r.grade < 1 || r.grade > 6 || !r.classroom || r.number < 1 || !r.reviewed
    ) ||
    new Set(rows.filter((r) => r.link).map((r) => r.link)).size !==
      rows.filter((r) => r.link).length
  const absent = pupils.filter(
    (s) => !rows.some((r) => r.link === s.id) && s.enrollments.some((e) => e.status === '재학')
  )
  return (
    <Modal
      title="반배정 명렬표 가져오기"
      subtitle="파일 선택 → 미리보기·연결 → 학년·졸업 확인 → 완료"
      onClose={onClose}
    >
      <div className="wt-tabs">
        {['입력', '확인·수정', '졸업 검토', '완료'].map((s, i) => (
          <span key={s} className={i === step ? 'active' : ''}>
            {i + 1}. {s}
          </span>
        ))}
      </div>
      {step === 0 ? (
        <>
          <p className="wt-note">
            화면 PoC에서는 CSV·탭으로 구분된 명렬표를 사용합니다. 실제 NEIS Excel 연결은 후속
            단계에서 구현합니다.
          </p>
          <Field label="대상 학년도">
            <TextInput
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </Field>
          <Field label="명렬표 입력 (성명,학년,반,번호,성별)">
            <Textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'성명,학년,반,번호,성별\n홍길동,1,1,1,남'}
            />
          </Field>
          <Field label="CSV 파일 선택">
            <TextInput
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) setText(await file.text())
              }}
            />
          </Field>
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() =>
                setText('성명,학년,반,번호,성별\n김하늘,2,1,3,여\n이서준,3,2,4,남\n김새봄,1,1,1,여')
              }
            >
              샘플 불러오기
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob(['\uFEFF성명,학년,반,번호,성별\n'], { type: 'text/csv;charset=utf-8' })
                )
                const a = document.createElement('a')
                a.href = url
                a.download = '명렬표-빈서식.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              빈 서식 저장
            </Button>
            <Button onClick={parse}>미리보기</Button>
          </div>

          <details>
            <summary>교무부에 보낼 요청 메시지</summary>
            <p>
              반배정 명렬표를 요청드립니다. 학생 성명, 학년, 반, 번호, 성별을 포함해 주세요. 실제
              NEIS 파일에는 학생개인번호와 이전학적정보도 포함해 주세요.
            </p>
          </details>
        </>
      ) : step === 1 ? (
        <>
          <p>
            {year}학년도 · {rows.length}명 · 입력값을 수정하고 기존 학생 연결 및 학년을 확인해
            주세요.
          </p>
          {rows.map((r, i) => (
            <Surface className="surface" style={{ padding: 16, marginBottom: 12 }} key={i}>
              <div className="form-grid">
                <Field label="이름">
                  <TextInput
                    value={r.name}
                    onChange={(e) => update(i, { name: e.target.value, reviewed: false })}
                  />
                </Field>
                <Field label="기존 학생 연결">
                  <FormSelect
                    value={r.link}
                    onValueChange={(e) => update(i, { link: e, reviewed: false })}
                  >
                    <option value="">새 학생 등록</option>
                    {pupils.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {enrollmentLabel(s.enrollments.at(-1))}
                      </option>
                    ))}
                  </FormSelect>
                </Field>
                <Field label="학년">
                  <TextInput
                    type="number"
                    min="1"
                    max="6"
                    value={r.grade}
                    onChange={(e) => update(i, { grade: Number(e.target.value), reviewed: false })}
                  />
                </Field>
                <Field label="반">
                  <TextInput
                    value={r.classroom}
                    onChange={(e) => update(i, { classroom: e.target.value, reviewed: false })}
                  />
                </Field>
                <Field label="번호">
                  <TextInput
                    type="number"
                    min="1"
                    value={r.number}
                    onChange={(e) => update(i, { number: Number(e.target.value), reviewed: false })}
                  />
                </Field>
                <Field label="성별">
                  <FormSelect
                    value={r.gender}
                    onValueChange={(e) => update(i, { gender: e as Pupil['gender'] })}
                  >
                    {['미입력', '남', '여'].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </FormSelect>
                </Field>
              </div>
              {r.link && (
                <p className="wt-note">
                  기존 학적:{' '}
                  {enrollmentLabel(pupils.find((s) => s.id === r.link)?.enrollments.at(-1))}
                </p>
              )}
              <label>
                <FormCheckbox
                  checked={r.reviewed}
                  onCheckedChange={(e) => update(i, { reviewed: e })}
                />{' '}
                입력값·학년·연결 학생을 확인했습니다
              </label>
            </Surface>
          ))}
          <p className="wt-note">
            같은 기존 학생을 여러 행에 연결할 수 없습니다. 모든 행의 이름·학적·학년 확인이
            필요합니다.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setStep(0)}>
              이전
            </Button>
            <Button disabled={invalid} onClick={() => setStep(2)}>
              졸업 처리 검토
            </Button>
          </div>
        </>
      ) : step === 2 ? (
        <>
          <h3>파일에 없는 학생의 졸업 처리</h3>
          <p>졸업이 확인된 학생만 선택하세요. 선택하지 않은 학생은 그대로 유지됩니다.</p>
          {absent.length ? (
            absent.map((s) => (
              <label className="wt-row-link" key={s.id}>
                <FormCheckbox
                  checked={graduates.includes(s.id)}
                  onCheckedChange={(e) =>
                    setGraduates(e ? [...graduates, s.id] : graduates.filter((id) => id !== s.id))
                  }
                />
                {s.name} · {enrollmentLabel(s.enrollments.at(-1))}
              </label>
            ))
          ) : (
            <p>검토할 학생이 없습니다.</p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setStep(1)}>
              이전
            </Button>
            <Button
              onClick={() => {
                setData((d) => {
                  let students = d.students.map((s) =>
                    graduates.includes(s.id)
                      ? {
                          ...s,
                          enrollments: s.enrollments.map((e) =>
                            e.year === Math.max(...s.enrollments.map((item) => item.year))
                              ? { ...e, status: '졸업' as const }
                              : e
                          )
                        }
                      : s
                  )
                  for (const row of rows) {
                    const enrollment: Enrollment = {
                      year,
                      grade: row.grade,
                      classroom: row.classroom,
                      number: row.number,
                      status: '재학'
                    }
                    if (row.link)
                      students = students.map((s) =>
                        s.id === row.link
                          ? {
                              ...s,
                              name: row.name,
                              gender: row.gender,
                              enrollments: [
                                ...s.enrollments.filter((e) => e.year !== year),
                                enrollment
                              ]
                            }
                          : s
                      )
                    else
                      students.push({
                        id: uid(),
                        schoolId: d.activeSchoolId,
                        name: row.name,
                        gender: row.gender,
                        contact: '',
                        guardianName: '',
                        guardianRelation: '',
                        guardianContact: '',
                        enrollments: [enrollment]
                      })
                  }
                  return { ...d, students }
                })
                setStep(3)
                notify('명렬표를 화면 데이터에 반영했습니다.', 'success')
              }}
            >
              총 {rows.length}명 가져오기 확정
            </Button>
          </div>
        </>
      ) : (
        <>
          <Empty
            title="가져오기를 마쳤습니다"
            description={`${rows.length}명의 학적을 반영했습니다. 졸업 처리 ${graduates.length}명.`}
          />
          <Button onClick={onClose}>확인</Button>
        </>
      )}
    </Modal>
  )
}

export function StudentsPage(): React.JSX.Element {
  const { data, setData, path, navigate, notify } = useWorkspace()
  const [search, setSearch] = useState(''),
    [grade, setGrade] = useState(''),
    [classroom, setClassroom] = useState(''),
    [gender, setGender] = useState(''),
    [year, setYear] = useState(data.settings.schoolYear),
    [enrolled, setEnrolled] = useState(true),
    [withCase, setWithCase] = useState(false),
    [sort, setSort] = useState('학적순')
  const [editor, setEditor] = useState<Pupil | null | undefined>(undefined),
    [upload, setUpload] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [remove, setRemove] = useState<string[]>([]),
    [statusTarget, setStatusTarget] = useState<Enrollment['status'] | null>(null),
    [academic, setAcademic] = useState<Enrollment | null>(null),
    [request, setRequest] = useState(false),
    [requestPreview, setRequestPreview] = useState(false)
  const view = new URLSearchParams(path.split('?')[1] || '').get('view')
  const [requestId, setRequestId] = useState('')
  const closeQuickView = (): void => {
    if (view) navigate('/students')
  }
  const id = path.split('?')[0].split('/')[2],
    student = data.students.find((s) => s.id === id && s.schoolId === data.activeSchoolId)
  const pupils = data.students.filter((s) => s.schoolId === data.activeSchoolId),
    studentCases = student
      ? data.cases.filter(
          (c) => c.studentIds.includes(student.id) && c.schoolId === data.activeSchoolId
        )
      : []
  const requestStudent = student ?? pupils.find((p) => p.id === requestId) ?? pupils[0]
  const list = pupils
    .filter((s) => {
      const e = s.enrollments.find((e) => e.year === year)
      return (
        s.name.includes(search) &&
        (!grade || e?.grade === Number(grade)) &&
        (!classroom || e?.classroom === classroom) &&
        (!gender || s.gender === gender) &&
        (!enrolled || e?.status === '재학') &&
        (!withCase || data.cases.some((c) => c.studentIds.includes(s.id)))
      )
    })
    .sort((a, b) => {
      const ae = a.enrollments.find((e) => e.year === year),
        be = b.enrollments.find((e) => e.year === year)
      return sort === '이름순'
        ? a.name.localeCompare(b.name, 'ko')
        : sort === '이름 역순'
          ? b.name.localeCompare(a.name, 'ko')
          : (ae?.grade || 0) - (be?.grade || 0) ||
            (ae?.classroom || '').localeCompare(be?.classroom || '', 'ko', { numeric: true }) ||
            (ae?.number || 0) - (be?.number || 0)
    })
  const visibleSelected = selected.filter((id) => list.some((s) => s.id === id))
  const clear = (): void => {
    setSearch('')
    setGrade('')
    setClassroom('')
    setGender('')
    setEnrolled(false)
    setWithCase(false)
  }
  return (
    <>
      <PageHeading
        title={student ? student.name : '학생 관리'}
        subtitle={
          student
            ? '학생 정보와 학년도별 사례·상담 기록을 함께 확인합니다.'
            : '학생의 학적과 상담 이력을 한곳에서 관리합니다.'
        }
      >
        {student ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setRequest(true)
                setRequestPreview(false)
              }}
            >
              학생 정보 요청
            </Button>
            <Button variant="secondary" onClick={() => setEditor(student)}>
              <Pencil size={16} />
              정보 수정
            </Button>
            <Button onClick={() => navigate(`/cases/new?studentId=${student.id}`)}>
              <Plus size={16} />
              사례 등록
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setUpload(true)}>
              <Upload size={16} />
              명렬표 가져오기
            </Button>
            <Button onClick={() => setEditor(null)}>
              <Plus size={16} />
              학생 등록
            </Button>
          </>
        )}
      </PageHeading>
      {id && !student ? (
        <Empty
          title="학생을 찾을 수 없습니다"
          action={<Button onClick={() => navigate('/students')}>학생 목록</Button>}
        />
      ) : student ? (
        <>
          <Back onClick={() => navigate('/students')}>학생 관리</Back>
          <Surface className="surface" style={{ padding: 24, marginTop: 16 }}>
            <h2>기본 정보</h2>
            <div className="form-grid">
              {[
                ['이름', student.name],
                ['성별', student.gender],
                ['학생 연락처', student.contact],
                ['보호자 이름', student.guardianName],
                ['보호자 관계', student.guardianRelation],
                ['보호자 연락처', student.guardianContact]
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="wt-note">{label}</p>
                  <strong>{value || '미입력'}</strong>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setRemove([student.id])}>
                <Trash2 size={15} />
                학생 삭제
              </Button>
            </div>
          </Surface>
          <Surface className="surface" style={{ padding: 24, marginTop: 20 }}>
            <div className="section-heading">
              <h2>학년도별 상담 기록</h2>
              <Button
                variant="secondary"
                onClick={() =>
                  setAcademic({
                    year: data.settings.schoolYear,
                    grade: 0,
                    classroom: '',
                    number: 0,
                    status: '재학'
                  })
                }
              >
                학적 추가
              </Button>
            </div>
            {Array.from(
              new Set([
                ...student.enrollments.map((e) => e.year),
                ...studentCases.map((c) => c.year)
              ])
            )
              .sort((a, b) => b - a)
              .map((y) => {
                const e = student.enrollments.find((e) => e.year === y),
                  cases = studentCases.filter((c) => c.year === y)
                return (
                  <details key={y} open className="wt-year-group">
                    <summary style={{ padding: '18px 0' }}>
                      <strong>{y}학년도</strong> · {enrollmentLabel(e)} · {e?.status || '학적 없음'}{' '}
                      · 사례 {cases.length}건
                    </summary>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setAcademic(
                          e
                            ? { ...e }
                            : { year: y, grade: 0, classroom: '', number: 0, status: '재학' }
                        )
                      }
                    >
                      학적 수정
                    </Button>
                    {cases.length ? (
                      cases.map((c) => (
                        <details
                          key={c.id}
                          style={{ padding: '12px 16px', borderLeft: '2px solid #dcecff' }}
                          open
                        >
                          <summary>
                            {c.number} · {c.complaint} · {c.status}
                          </summary>
                          <Button variant="ghost" onClick={() => navigate(`/cases/${c.id}`)}>
                            사례 상세 보기
                            <ChevronRight size={14} />
                          </Button>
                          {data.sessions
                            .filter((s) => s.caseId === c.id && s.studentIds.includes(student.id))
                            .map((s) => (
                              <button
                                className="wt-row-link"
                                key={s.id}
                                onClick={() => navigate(`/cases/${c.id}/sessions/${s.id}`)}
                              >
                                <span>
                                  {s.start.slice(0, 10)} · {s.title}
                                  <small style={{ display: 'block' }}>
                                    나이스 상담제목: {s.neisTitle || '미입력'}
                                  </small>
                                </span>
                                <Badge tone={s.status === '완료' ? 'green' : 'blue'}>
                                  {s.status}
                                </Badge>
                              </button>
                            ))}
                        </details>
                      ))
                    ) : (
                      <p className="wt-note">등록된 사례 없음</p>
                    )}
                  </details>
                )
              })}
            {!student.enrollments.length && !studentCases.length && (
              <Empty title="등록된 학적 및 상담 기록이 없습니다" />
            )}
          </Surface>
        </>
      ) : (
        <>
          <Surface className="surface" style={{ padding: 20 }}>
            <div className="form-grid">
              <Field label="이름으로 검색">
                <TextInput
                  placeholder="이름으로 검색…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Field>
              <Field label="학년도">
                <TextInput
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </Field>
              <Field label="학년">
                <FormSelect value={grade} onValueChange={(e) => setGrade(e)}>
                  <option value="">전체 학년</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}학년
                    </option>
                  ))}
                </FormSelect>
              </Field>
              <Field label="반">
                <TextInput
                  placeholder="전체 반"
                  value={classroom}
                  onChange={(e) => setClassroom(e.target.value)}
                />
              </Field>
              <Field label="성별">
                <FormSelect value={gender} onValueChange={(e) => setGender(e)}>
                  {['', '남', '여', '미입력'].map((g) => (
                    <option key={g} value={g}>
                      {g || '전체'}
                    </option>
                  ))}
                </FormSelect>
              </Field>
              <Field label="정렬">
                <FormSelect value={sort} onValueChange={(e) => setSort(e)}>
                  {['학적순', '이름순', '이름 역순'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </FormSelect>
              </Field>
            </div>
            <div className="modal-actions">
              <label>
                <FormCheckbox checked={enrolled} onCheckedChange={(e) => setEnrolled(e)} /> 재학생만
              </label>
              <label>
                <FormCheckbox checked={withCase} onCheckedChange={(e) => setWithCase(e)} /> 사례
                있는 학생만
              </label>
              <Button variant="ghost" onClick={clear}>
                필터 해제
              </Button>
            </div>
          </Surface>
          <Surface className="surface" style={{ padding: 20, marginTop: 20 }}>
            <div className="section-heading">
              <h2>
                <Users size={18} /> 학생 {list.length}명
              </h2>
              {!!visibleSelected.length && (
                <div className="heading-actions">
                  <span>{visibleSelected.length}명 선택</span>
                  <Button variant="secondary" onClick={() => setStatusTarget('졸업')}>
                    졸업 처리
                  </Button>
                  <Button variant="secondary" onClick={() => setStatusTarget('재학')}>
                    재학으로 변경
                  </Button>
                  <Button variant="ghost" onClick={() => setRemove(visibleSelected)}>
                    선택 삭제
                  </Button>
                </div>
              )}
            </div>
            {list.length ? (
              <div style={{ overflowX: 'auto' }}>
                <Table className="data-table" style={{ width: '100%' }}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <FormCheckbox
                          aria-label="현재 학생 모두 선택"
                          checked={list.every((s) => selected.includes(s.id))}
                          onCheckedChange={(e) => setSelected(e ? list.map((s) => s.id) : [])}
                        />
                      </TableHead>
                      <TableHead>학생 이름</TableHead>
                      <TableHead>학적</TableHead>
                      <TableHead>성별</TableHead>
                      <TableHead>재학 상태</TableHead>
                      <TableHead>사례</TableHead>
                      <TableHead>관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((s) => {
                      const e = s.enrollments.find((e) => e.year === year)
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <FormCheckbox
                              aria-label={`${s.name} 선택`}
                              checked={selected.includes(s.id)}
                              onCheckedChange={(e) =>
                                setSelected(
                                  e ? [...selected, s.id] : selected.filter((id) => id !== s.id)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <button
                              className="text-link"
                              onClick={() => navigate(`/students/${s.id}`)}
                            >
                              {s.name}
                            </button>
                          </TableCell>
                          <TableCell>{enrollmentLabel(e)}</TableCell>
                          <TableCell>{s.gender}</TableCell>
                          <TableCell>
                            <Badge tone={e?.status === '재학' ? 'blue' : 'gray'}>
                              {e?.status || '미등록'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {data.cases.filter((c) => c.studentIds.includes(s.id)).length}건
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" onClick={() => setEditor(s)}>
                              수정
                            </Button>
                            <Button variant="ghost" onClick={() => setRemove([s.id])}>
                              삭제
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Empty
                title="조건에 맞는 학생이 없습니다"
                action={
                  <Button variant="secondary" onClick={clear}>
                    필터 해제
                  </Button>
                }
              />
            )}
          </Surface>
        </>
      )}
      {(editor !== undefined || view === 'new') && (
        <StudentEditor
          student={editor ?? null}
          onClose={() => {
            setEditor(undefined)
            closeQuickView()
          }}
        />
      )}{' '}
      {(upload || view === 'import') && (
        <RosterUpload
          onClose={() => {
            setUpload(false)
            closeQuickView()
          }}
        />
      )}
      {!!remove.length && (
        <Modal title="학생을 삭제하시겠습니까?" onClose={() => setRemove([])}>
          <p>
            {remove.length}명의 학생 정보와 학적을 삭제합니다. 사례와 상담 기록에서는 학생 연결이
            해제됩니다.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setRemove([])}>
              취소
            </Button>
            <Button
              onClick={() => {
                setData((d) => ({
                  ...d,
                  students: d.students.filter((s) => !remove.includes(s.id)),
                  cases: d.cases.map((c) => ({
                    ...c,
                    studentIds: c.studentIds.filter((id) => !remove.includes(id))
                  })),
                  sessions: d.sessions.map((s) => ({
                    ...s,
                    studentIds: s.studentIds.filter((id) => !remove.includes(id))
                  }))
                }))
                setRemove([])
                setSelected([])
                notify('학생이 삭제되었습니다.', 'success')
                if (student) navigate('/students')
              }}
            >
              삭제
            </Button>
          </div>
        </Modal>
      )}
      {statusTarget && (
        <Modal
          title={`${visibleSelected.length}명 ${statusTarget} 처리`}
          onClose={() => setStatusTarget(null)}
        >
          <p>
            {year}학년도 학적 상태를 {statusTarget}으로 변경합니다.{' '}
            {statusTarget === '졸업' && '졸업 대상 학년인지 확인해 주세요.'}
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setStatusTarget(null)}>
              취소
            </Button>
            <Button
              onClick={() => {
                setData((d) => ({
                  ...d,
                  students: d.students.map((s) =>
                    visibleSelected.includes(s.id)
                      ? {
                          ...s,
                          enrollments: s.enrollments.map((e) =>
                            e.year === year ? { ...e, status: statusTarget } : e
                          )
                        }
                      : s
                  )
                }))
                setStatusTarget(null)
                setSelected([])
                notify('재학 상태가 변경되었습니다.', 'success')
              }}
            >
              확인
            </Button>
          </div>
        </Modal>
      )}
      {academic && student && (
        <Modal
          title="학년도별 학적"
          subtitle="같은 학년도의 기존 학적은 새 입력값으로 수정됩니다."
          onClose={() => setAcademic(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setData((d) => ({
                ...d,
                students: d.students.map((s) =>
                  s.id === student.id
                    ? {
                        ...s,
                        enrollments: [
                          ...s.enrollments.filter((e) => e.year !== academic.year),
                          academic
                        ]
                      }
                    : s
                )
              }))
              setAcademic(null)
              notify('학적이 저장되었습니다.', 'success')
            }}
          >
            <EnrollmentFields value={academic} onChange={setAcademic} />
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={() => setAcademic(null)}>
                취소
              </Button>
              <Button type="submit">학적 저장</Button>
            </div>
          </form>
        </Modal>
      )}
      {(request || view === 'request') && requestStudent && (
        <Modal
          title="학생 정보 요청"
          subtitle="보호자가 입력할 정보 요청 화면을 미리 확인합니다. 실제 발송은 하지 않습니다."
          onClose={() => {
            setRequest(false)
            closeQuickView()
          }}
        >
          {requestPreview ? (
            <Surface className="surface wt-preview">
              <h3>학생 기본 정보 확인 요청</h3>
              <p>{requestStudent.name} 학생의 보호자님, 상담을 위한 기본 정보를 확인해 주세요.</p>
              <Field label="보호자 이름">
                <TextInput defaultValue={requestStudent.guardianName} />
              </Field>
              <Field label="학생과의 관계">
                <TextInput defaultValue={requestStudent.guardianRelation} />
              </Field>
              <Field label="보호자 연락처">
                <TextInput defaultValue={requestStudent.guardianContact} />
              </Field>
              <label>
                <FormCheckbox /> 개인정보 수집·이용 안내를 확인했습니다.
              </label>
              <p className="wt-note">보호자 화면 미리보기입니다. 입력값은 전송되지 않습니다.</p>
            </Surface>
          ) : (
            <>
              <Field label="대상 학생">
                <FormSelect
                  value={requestStudent.id}
                  onValueChange={(e) => setRequestId(e)}
                  disabled={!!student}
                >
                  {pupils.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </FormSelect>
              </Field>
              <Field label="보호자 연락처">
                <TextInput
                  defaultValue={requestStudent.guardianContact}
                  placeholder="연락처 입력"
                />
              </Field>
              <Field label="전달 방법">
                <FormSelect>
                  <option>링크 직접 전달</option>
                  <option>문자 메시지</option>
                </FormSelect>
              </Field>
            </>
          )}
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setRequest(false)
                closeQuickView()
              }}
            >
              닫기
            </Button>
            <Button onClick={() => setRequestPreview(!requestPreview)}>
              {requestPreview ? '요청 설정' : '보호자 화면 미리보기'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
