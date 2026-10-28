import { toast } from '../lib/toast'
import { useRef, useState, type PointerEvent } from 'react'
import { useWorkspace } from './context'
import {
  day,
  uid,
  type CaseRecord,
  type Consent,
  type ConsentTemplate,
  type ConsentTemplateField
} from './model'
import { Surface, Button, Field, Modal, Badge, Empty } from './ui'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { DateInput, FormCheckbox, FormSelect } from '../components/form-controls'

function selectedValues(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}
function SignatureInput({
  label,
  onChange
}: {
  label: string
  onChange: (value: string) => void
}): React.JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef<number | null>(null)
  const [typed, setTyped] = useState('')
  function point(event: PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) * 640) / rect.width,
      y: ((event.clientY - rect.top) * 180) / rect.height
    }
  }
  function save(): void {
    if (canvas.current) onChange(canvas.current.toDataURL('image/png'))
  }
  return (
    <div className="space-y-3">
      <canvas
        ref={canvas}
        width={640}
        height={180}
        aria-label={`${label} 그리기`}
        className="h-36 w-full touch-none rounded-lg border bg-white"
        onPointerDown={(event) => {
          if (event.button !== 0 || drawing.current !== null) return
          drawing.current = event.pointerId
          event.currentTarget.setPointerCapture(event.pointerId)
          const ctx = event.currentTarget.getContext('2d')
          if (!ctx) return
          const p = point(event)
          ctx.strokeStyle = '#24364a'
          ctx.lineWidth = 2.5
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x + 0.1, p.y)
          ctx.stroke()
        }}
        onPointerMove={(event) => {
          if (drawing.current !== event.pointerId) return
          const ctx = event.currentTarget.getContext('2d')
          if (!ctx) return
          const p = point(event)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
        }}
        onPointerUp={(event) => {
          if (drawing.current !== event.pointerId) return
          drawing.current = null
          save()
        }}
        onPointerCancel={() => {
          drawing.current = null
          save()
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-44 flex-1"
          aria-label={`${label} 이름으로 서명`}
          placeholder="직접 그리거나 이름으로 서명하세요"
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value)
            const ctx = canvas.current?.getContext('2d')
            if (!ctx) return
            ctx.clearRect(0, 0, 640, 180)
            ctx.font = '36px sans-serif'
            ctx.fillStyle = '#24364a'
            ctx.fillText(e.target.value.slice(0, 30), 24, 100)
            if (e.target.value.trim()) save()
            else onChange('')
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            canvas.current?.getContext('2d')?.clearRect(0, 0, 640, 180)
            setTyped('')
            onChange('')
          }}
        >
          서명 지우기
        </Button>
      </div>
    </div>
  )
}
function ConsentAnswer({
  field: f,
  value,
  onChange
}: {
  field: ConsentTemplateField
  value: string
  onChange: (value: string) => void
}): React.JSX.Element {
  if (f.type === 'signature') return <SignatureInput label={f.label} onChange={onChange} />
  if (f.type === 'date')
    return <DateInput aria-label={f.label} value={value} onValueChange={onChange} />
  if (f.type === 'select' && f.multiple)
    return (
      <div role="group" aria-label={f.label} className="flex flex-wrap gap-3">
        {(f.options ?? []).map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <FormCheckbox
              aria-label={option}
              checked={selectedValues(value).includes(option)}
              onCheckedChange={(checked) => {
                const values = checked
                  ? [...selectedValues(value), option]
                  : selectedValues(value).filter((v) => v !== option)
                onChange(values.length ? JSON.stringify(values) : '')
              }}
            />
            {option}
          </label>
        ))}
      </div>
    )
  if (f.type === 'select' || f.type === 'consent')
    return (
      <FormSelect aria-label={f.label} value={value} onValueChange={onChange}>
        <option value="">선택해 주세요</option>
        {(f.type === 'consent' ? ['동의', '미동의'] : (f.options ?? [])).map((option) => (
          <option key={option}>{option}</option>
        ))}
      </FormSelect>
    )
  if (f.type === 'textarea')
    return (
      <Textarea
        aria-label={f.label}
        required={f.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  return (
    <Input
      aria-label={f.label}
      required={f.required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function newTemplate(): ConsentTemplate {
  return {
    id: uid(),
    name: '',
    title: '',
    body: '',
    isDefault: false,
    fields: [
      { id: uid(), label: '보호자 성명', type: 'text', required: true },
      { id: uid(), label: '상담 참여', type: 'consent', required: true },
      { id: uid(), label: '개인정보 수집·이용', type: 'consent', required: true }
    ]
  }
}
export function Consents({ record }: { record: CaseRecord }): React.JSX.Element {
  const { data, setData, notify, navigate } = useWorkspace()
  const pupils = data.students.filter((s) => record.studentIds.includes(s.id))
  const templates = data.consentTemplates
  const [mode, setMode] = useState<
    'send' | 'parent' | 'view' | 'log' | 'manager' | 'links' | 'print' | ''
  >('')
  const [draft, setDraft] = useState<ConsentTemplate>(newTemplate)
  const draftBaseline = useRef('')
  const [discard, setDiscard] = useState(false)
  function resetDraft(value: ConsentTemplate): void {
    setDraft(value)
    draftBaseline.current = JSON.stringify(value)
  }
  function closeManager(): void {
    if (JSON.stringify(draft) !== draftBaseline.current) setDiscard(true)
    else setMode('')
  }
  const [deleteId, setDeleteId] = useState('')
  const [targets, setTargets] = useState<string[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [channel, setChannel] = useState<'sms' | 'link'>('link')
  const [requestId, setRequestId] = useState('')
  const [generated, setGenerated] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const request = record.consents.find((c) => c.id === requestId)
  const targetPupils = pupils.filter((s) => targets.includes(s.id))
  const count = selectedStudents.length * selectedTemplates.length
  const prior = record.consents.filter(
    (r) => selectedStudents.includes(r.studentId) && selectedTemplates.includes(r.templateId ?? '')
  )
  function openSend(ids: string[]): void {
    const sms = pupils.some((s) => ids.includes(s.id) && s.guardianContact)
    setTargets(ids)
    setChannel(sms ? 'sms' : 'link')
    setSelectedStudents(
      ids.filter((id) => !sms || pupils.find((s) => s.id === id)?.guardianContact)
    )
    setSelectedTemplates(templates.filter((t) => t.isDefault).map((t) => t.id))

    setMode('send')
  }
  function toggle(values: string[], id: string): string[] {
    return values.includes(id) ? values.filter((v) => v !== id) : [...values, id]
  }
  function openResponse(id: string, next: 'parent' | 'view'): void {
    setRequestId(id)
    setAnswers({})

    setMode(next)
  }
  function update(id: string, patch: Partial<Consent>, event: string): void {
    setData((d) => ({
      ...d,
      cases: d.cases.map((c) =>
        c.id === record.id
          ? {
              ...c,
              consents: c.consents.map((r) =>
                r.id === id
                  ? {
                      ...r,
                      ...patch,
                      history: [...(r.history ?? []), { at: new Date().toISOString(), text: event }]
                    }
                  : r
              )
            }
          : c
      )
    }))
  }
  async function copyLink(id: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(`https://consent.example.invalid/demo/${id}`)
      notify('시연 링크를 복사했습니다. 실제 외부 페이지는 열리지 않습니다.', 'success')
    } catch {
      notify('복사할 수 없습니다. 링크를 직접 선택해 복사해 주세요.')
    }
  }
  function send(): void {
    if (!count) return
    const invalid = pupils.find(
      (s) =>
        selectedStudents.includes(s.id) &&
        channel === 'sms' &&
        !/^01\d{8,9}$/.test(s.guardianContact.replace(/\D/g, ''))
    )
    if (invalid) {
      toast.error(`${invalid.name} 학생의 보호자 연락처를 학생 정보에서 확인해 주세요.`)
      return
    }
    const at = new Date().toISOString()
    const requests: Consent[] = selectedStudents.flatMap((studentId) =>
      selectedTemplates.map((templateId) => {
        const t = templates.find((v) => v.id === templateId)!
        return {
          id: uid(),
          title: t.title || t.name,
          body: t.body,
          studentId,
          templateId,
          fields: structuredClone(t.fields),
          status: '응답 대기',
          date: day(),
          channel,
          recipient: pupils.find((s) => s.id === studentId)?.guardianContact,
          history: [
            {
              at,
              text: channel === 'sms' ? '문자 발송 시연 · 응답 대기' : '링크 생성 시연 · 응답 대기'
            }
          ]
        }
      })
    )
    setData((d) => ({
      ...d,
      cases: d.cases.map((c) =>
        c.id === record.id
          ? {
              ...c,
              consents: [
                ...c.consents.map((r) =>
                  r.status === '응답 대기' &&
                  selectedStudents.includes(r.studentId) &&
                  selectedTemplates.includes(r.templateId ?? '')
                    ? {
                        ...r,
                        status: '만료' as const,
                        history: [...(r.history ?? []), { at, text: '재발송으로 이전 링크 만료' }]
                      }
                    : r
                ),
                ...requests
              ]
            }
          : c
      )
    }))
    setGenerated(requests.map((r) => r.id))
    setMode(channel === 'link' ? 'links' : '')
    notify(
      channel === 'sms'
        ? `문자 발송 시연 완료 · 학생 ${selectedStudents.length}명, 동의서 ${count}건`
        : `시연 링크 ${count}건을 생성했습니다.`
    )
  }
  if (!data.account.logged || !data.account.subscribed)
    return (
      <Surface className="flex flex-col gap-4">
        <h2>보호자 동의서</h2>
        <p className="font-medium">보호자 동의서는 구독 플랜에서 제공됩니다.</p>
        <p className="text-sm text-slate-500">
          Free 플랜에서는 양식, 링크 생성·복사, 응답 수합 및 SMS 발송을 사용할 수 없습니다. 구독 /
          계정에서 구독 등록을 체험해 주세요.
        </p>
        <div>
          <Button onClick={() => navigate('/settings#settings-subscription')}>
            구독 / 계정으로 이동
          </Button>
        </div>
      </Surface>
    )
  return (
    <div className="wt-stack">
      <Surface className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>보호자 동의서</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                resetDraft(newTemplate())
                setMode('manager')
              }}
            >
              양식 관리
            </Button>
            <Button variant="ghost" onClick={() => setMode('log')}>
              처리 기록
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          <span>응답 수신 시연 준비</span>
          <span>앱 내 학부모 화면에서 응답을 제출할 수 있습니다.</span>
        </div>
        <p className="wt-note">
          실제 문자·외부 링크·원격 수신은 연결하지 않은 시연입니다. 응답 결과는 새로고침 전까지
          유지됩니다.
        </p>
        {pupils.length > 1 && (
          <Button
            variant="secondary"
            disabled={!templates.length}
            onClick={() => openSend(pupils.map((s) => s.id))}
          >
            전체 학생에게 한 번에 발송
          </Button>
        )}
        {!pupils.length && <Empty title="등록된 학생이 없습니다" />}
        {pupils.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
          >
            <div>
              <strong>{s.name}</strong>
              <span className="ml-3 text-sm text-slate-500">
                {s.guardianName ? `보호자 ${s.guardianName}` : '보호자 미등록'}
                {s.guardianContact ? ` · ${s.guardianContact}` : ''}
              </span>
            </div>
            <div className="flex gap-2">
              {!s.guardianContact && (
                <Button variant="ghost" onClick={() => navigate(`/students/${s.id}`)}>
                  연락처 등록
                </Button>
              )}
              <Button disabled={!templates.length} onClick={() => openSend([s.id])}>
                동의서 발송
              </Button>
            </div>
          </div>
        ))}
      </Surface>
      {record.consents.length > 0 && (
        <Surface className="flex flex-col gap-4">
          <h2>동의서 목록</h2>
          {record.consents.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{pupils.find((s) => s.id === r.studentId)?.name}</strong>
                  <Badge
                    tone={
                      r.status === '응답 대기' ? 'amber' : r.status === '만료' ? 'gray' : 'green'
                    }
                  >
                    {r.status === '동의' || r.status === '미동의'
                      ? `응답 완료 · ${r.status}`
                      : r.status}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {r.channel === 'sms' ? 'SMS' : '링크'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {r.title} · {r.date}
                </p>
              </div>
              <div className="flex gap-2">
                {r.status === '응답 대기' && (
                  <>
                    <Button variant="ghost" onClick={() => void copyLink(r.id)}>
                      링크 복사
                    </Button>
                    <Button variant="secondary" onClick={() => openResponse(r.id, 'parent')}>
                      학부모 화면 체험
                    </Button>
                  </>
                )}
                {(r.status === '동의' || r.status === '미동의') && (
                  <Button variant="secondary" onClick={() => openResponse(r.id, 'view')}>
                    응답 보기
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Surface>
      )}
      {mode === 'send' && (
        <Modal
          title="동의서 발송"
          subtitle={
            targetPupils.length === 1
              ? `${targetPupils[0].name} 학생의 보호자에게 동의서를 전달합니다.`
              : '선택한 학생들의 보호자에게 동의서를 전달합니다.'
          }
          onClose={() => setMode('')}
        >
          <div className="wt-demo-form flex flex-col gap-5">
            {targetPupils.length > 1 && (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">
                  학생 ({selectedStudents.length}/{targets.length}명 선택)
                </legend>
                {targetPupils.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <FormCheckbox
                      checked={selectedStudents.includes(s.id)}
                      disabled={channel === 'sms' && !s.guardianContact}
                      onCheckedChange={() => setSelectedStudents(toggle(selectedStudents, s.id))}
                    />
                    <span>{s.name}</span>
                    <span className="ml-auto text-xs text-slate-500">
                      {s.guardianContact ||
                        (channel === 'sms' ? '연락처 없음 — SMS 제외' : '연락처 없음')}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">양식 (여러 개 선택 가능)</legend>
              {templates.map((t) => (
                <label key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <FormCheckbox
                    checked={selectedTemplates.includes(t.id)}
                    onCheckedChange={() => setSelectedTemplates(toggle(selectedTemplates, t.id))}
                  />
                  <span>
                    {t.name}
                    {t.isDefault ? ' (기본)' : ''}
                  </span>
                </label>
              ))}
            </fieldset>
            <Field label="전달 방법">
              <FormSelect
                value={channel}
                onValueChange={(v) => {
                  setChannel(v as 'sms' | 'link')
                  if (v === 'sms')
                    setSelectedStudents(
                      selectedStudents.filter(
                        (id) => pupils.find((s) => s.id === id)?.guardianContact
                      )
                    )
                }}
              >
                <option value="sms" disabled={!targetPupils.some((s) => s.guardianContact)}>
                  SMS 자동 발송
                  {!targetPupils.some((s) => s.guardianContact) ? ' (연락처 없음)' : ''}
                </option>
                <option value="link">링크 직접 전달(복사)</option>
              </FormSelect>
            </Field>
            {prior.some((r) => r.status === '응답 대기') && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                이미 발송한 동의서가 있습니다. 다시 보내면 이전 링크는 만료됩니다.
              </p>
            )}
            {prior.some((r) => r.status === '동의' || r.status === '미동의') && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                응답이 완료된 양식이 선택되어 있습니다. 재발송해도 기존 응답은 보관됩니다.
              </p>
            )}
            {channel === 'sms' && (
              <p className="text-sm text-slate-500">
                {targetPupils.length === 1
                  ? `수신 번호: ${targetPupils[0].guardianContact}`
                  : `선택한 학생 ${selectedStudents.length}명의 보호자`}{' '}
                · 학생당 문자 1통에 양식 링크를 묶어 보냅니다.
              </p>
            )}
            <p className="wt-note">시연 전용 · 실제 발송과 링크 접속은 이루어지지 않습니다.</p>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="secondary" onClick={() => setMode('')}>
                취소
              </Button>
              <Button disabled={!count} onClick={send}>
                {channel === 'sms' ? '문자 발송' : '링크 생성'}
                {count > 1 ? ` (${count}건)` : ''}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {mode === 'links' && (
        <Modal title="동의서 링크" onClose={() => setMode('')}>
          <div className="flex flex-col gap-4">
            <p>
              학생별 링크를 복사해 전달하는 흐름을 체험합니다. 아래 주소는 접속되지 않는 시연
              주소입니다.
            </p>
            {record.consents
              .filter((r) => generated.includes(r.id))
              .map((r) => (
                <div key={r.id} className="rounded-lg border p-4">
                  <h3>
                    {pupils.find((s) => s.id === r.studentId)?.name} · {r.title}
                  </h3>
                  <p className="my-3 break-all text-sm text-slate-500">
                    https://consent.example.invalid/demo/{r.id}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => void copyLink(r.id)}>
                      링크 복사
                    </Button>
                    <Button onClick={() => openResponse(r.id, 'parent')}>학부모 화면 체험</Button>
                  </div>
                </div>
              ))}
          </div>
        </Modal>
      )}
      {(mode === 'parent' || mode === 'view' || mode === 'print') && request && (
        <Modal
          title={
            mode === 'parent'
              ? '학부모 동의 화면 체험'
              : mode === 'print'
                ? '동의서 출력 미리보기'
                : '동의서 응답'
          }
          subtitle={`${pupils.find((s) => s.id === request.studentId)?.name} · ${request.title}`}
          onClose={() => setMode('')}
        >
          <form
            className="wt-demo-form flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (request.status !== '응답 대기') return
              if (request.fields?.some((f) => f.required && !answers[f.id]?.trim())) {
                toast.warn('필수 응답 항목을 모두 입력해 주세요.')
                return
              }
              const agreed =
                request.fields
                  ?.filter((f) => f.type === 'consent')
                  .every((f) => answers[f.id] === '동의') ?? false
              update(
                request.id,
                {
                  answers,
                  status: agreed ? '동의' : '미동의',
                  guardian: request.fields?.find((f) => f.label === '보호자 성명')
                    ? answers[request.fields.find((f) => f.label === '보호자 성명')!.id]
                    : '',
                  counselingAgreed: request.fields?.some(
                    (f) => f.label === '상담 참여' && answers[f.id] === '동의'
                  ),
                  privacyAgreed: request.fields?.some(
                    (f) => f.label === '개인정보 수집·이용' && answers[f.id] === '동의'
                  )
                },
                '학부모 응답 수신 시연'
              )
              setMode('view')
              notify('학부모 응답이 상담사 화면에 반영되었습니다.', 'success')
            }}
          >
            {mode !== 'parent' && (
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setMode('print')}>
                  A4 인쇄
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setMode('print')
                    notify('PDF 구성 미리보기입니다. 실제 파일은 생성하지 않습니다.')
                  }}
                >
                  PDF 저장
                </Button>
              </div>
            )}
            {request.body && (
              <div className="rounded-lg border bg-slate-50/50 p-4 text-sm leading-7 whitespace-pre-wrap">
                {request.body}
              </div>
            )}
            {request.fields?.map((f) =>
              mode === 'parent' ? (
                <div key={f.id} className="space-y-2">
                  <div className="field">
                    <span>{f.label}</span>
                    <ConsentAnswer
                      field={f}
                      value={answers[f.id] ?? ''}
                      onChange={(v) => setAnswers({ ...answers, [f.id]: v })}
                    />
                  </div>
                  {f.description && (
                    <p className="text-sm leading-6 text-slate-500">{f.description}</p>
                  )}
                  {f.required && <p className="text-xs text-slate-400">필수 항목</p>}
                </div>
              ) : (
                <div key={f.id}>
                  <p className="text-sm text-slate-500">{f.label}</p>
                  {f.type === 'signature' &&
                  request.answers?.[f.id]?.startsWith('data:image/png') ? (
                    <img
                      className="mt-2 max-h-36 rounded-lg border bg-white"
                      src={request.answers[f.id]}
                      alt={`${f.label} 서명`}
                    />
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap">
                      {f.multiple
                        ? selectedValues(request.answers?.[f.id] ?? '').join(', ') || '미입력'
                        : request.answers?.[f.id] || '미입력'}
                    </p>
                  )}
                </div>
              )
            )}
            {mode === 'parent' ? (
              <>
                <p className="wt-note">실제 원격 수신·전자서명이 아닌 앱 내부 시연입니다.</p>

                <Button type="submit">응답 제출 체험</Button>
              </>
            ) : (
              <Badge>{request.status === '동의' ? '동의' : '미동의'} · 응답 수신 완료</Badge>
            )}
          </form>
        </Modal>
      )}
      {mode === 'manager' && (
        <Modal
          title="동의서 양식 관리"
          subtitle="질문지 종류와 응답 항목을 추가·편집합니다."
          onClose={closeManager}
        >
          <form
            className="wt-demo-form flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (
                !draft.name.trim() ||
                !draft.fields.length ||
                draft.fields.some((f) => !f.label.trim())
              ) {
                toast.warn('템플릿 이름과 응답 항목의 라벨을 입력하세요.')
                return
              }
              if (
                draft.fields.some((f) => f.type === 'select' && !f.options?.some((v) => v.trim()))
              ) {
                toast.warn('선택 항목에는 선택지를 한 개 이상 입력하세요.')
                return
              }
              const saved = {
                ...draft,
                name: draft.name.trim(),
                title: draft.title.trim(),
                fields: draft.fields.map((f) => ({
                  ...f,
                  label: f.label.trim(),
                  options: f.options
                    ? [...new Set(f.options.map((v) => v.trim()).filter(Boolean))]
                    : undefined
                }))
              }
              setData((d) => ({
                ...d,
                consentTemplates: d.consentTemplates.some((t) => t.id === draft.id)
                  ? d.consentTemplates.map((t) => (t.id === draft.id ? saved : t))
                  : [...d.consentTemplates, saved]
              }))

              resetDraft(newTemplate())
              notify('양식을 저장했습니다.', 'success')
            }}
          >
            <div>
              <p className="mb-3 text-sm font-medium">저장된 양식</p>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-1 rounded-lg border">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        resetDraft(structuredClone(t))
                      }}
                    >
                      {t.name}
                      {t.isDefault ? ' (기본)' : ''}
                    </Button>
                    {!t.isDefault && (
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`${t.name} 양식 삭제`}
                        onClick={() => setDeleteId(t.id)}
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => resetDraft(newTemplate())}>
                  새 양식
                </Button>
              </div>
            </div>
            <div className="form-grid">
              <Field label="템플릿 이름">
                <Input
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="폼 제목(보호자 화면)">
                <Input
                  value={draft.title}
                  placeholder="비우면 템플릿 이름 사용"
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </Field>
            </div>
            <Field label="상단 안내문(법적 고지)">
              <Textarea
                rows={3}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </Field>
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium">응답 항목</legend>
              {draft.fields.map((f, i) => (
                <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                  <Input
                    className="min-w-40 flex-1"
                    aria-label={`${i + 1}번 질문`}
                    value={f.label}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        fields: draft.fields.map((x) =>
                          x.id === f.id ? { ...x, label: e.target.value } : x
                        )
                      })
                    }
                  />
                  <FormSelect
                    aria-label={`${i + 1}번 응답 유형`}
                    value={f.type}
                    onValueChange={(v) =>
                      setDraft({
                        ...draft,
                        fields: draft.fields.map((x) =>
                          x.id === f.id ? { ...x, type: v as typeof f.type } : x
                        )
                      })
                    }
                  >
                    <option value="text">단답</option>
                    <option value="textarea">장문</option>
                    <option value="select">선택</option>
                    <option value="date">날짜</option>
                    <option value="consent">동의문구</option>
                    <option value="signature">전자서명</option>
                  </FormSelect>
                  <label className="flex items-center gap-2 text-sm">
                    <FormCheckbox
                      checked={f.required}
                      onCheckedChange={(v) =>
                        setDraft({
                          ...draft,
                          fields: draft.fields.map((x) =>
                            x.id === f.id ? { ...x, required: v } : x
                          )
                        })
                      }
                    />
                    필수
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={i === 0}
                    aria-label={`${i + 1}번 항목 위로 이동`}
                    onClick={() => {
                      const fields = [...draft.fields]
                      ;[fields[i - 1], fields[i]] = [fields[i], fields[i - 1]]
                      setDraft({ ...draft, fields })
                    }}
                  >
                    위로
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`${i + 1}번 항목 삭제`}
                    onClick={() =>
                      setDraft({ ...draft, fields: draft.fields.filter((x) => x.id !== f.id) })
                    }
                  >
                    삭제
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={i === draft.fields.length - 1}
                    aria-label={`${i + 1}번 항목 아래로 이동`}
                    onClick={() => {
                      const fields = [...draft.fields]
                      ;[fields[i], fields[i + 1]] = [fields[i + 1], fields[i]]
                      setDraft({ ...draft, fields })
                    }}
                  >
                    아래로
                  </Button>
                  {f.type === 'select' ? (
                    <div className="flex w-full flex-wrap items-center gap-3">
                      <Input
                        aria-label={`${i + 1}번 선택지`}
                        className="min-w-44 flex-1"
                        placeholder="선택지 쉼표로 구분 (예: 부, 모, 기타)"
                        value={f.options?.join(',') ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            fields: draft.fields.map((x) =>
                              x.id === f.id ? { ...x, options: e.target.value.split(',') } : x
                            )
                          })
                        }
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <FormCheckbox
                          checked={f.multiple ?? false}
                          onCheckedChange={(v) =>
                            setDraft({
                              ...draft,
                              fields: draft.fields.map((x) =>
                                x.id === f.id ? { ...x, multiple: v } : x
                              )
                            })
                          }
                        />
                        여러 개 선택
                      </label>
                    </div>
                  ) : (
                    f.type !== 'date' && (
                      <Input
                        className="w-full"
                        aria-label={`${i + 1}번 안내문`}
                        placeholder={
                          f.type === 'consent'
                            ? '동의 문구 본문'
                            : f.type === 'signature'
                              ? '서명 안내문'
                              : '답변 안내 문구'
                        }
                        value={f.description ?? ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            fields: draft.fields.map((x) =>
                              x.id === f.id ? { ...x, description: e.target.value } : x
                            )
                          })
                        }
                      />
                    )
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setDraft({
                    ...draft,
                    fields: [
                      ...draft.fields,
                      { id: uid(), label: '', type: 'text', required: false }
                    ]
                  })
                }
              >
                항목 추가
              </Button>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <label className="flex items-center gap-2 text-sm">
                <FormCheckbox
                  checked={draft.isDefault}
                  onCheckedChange={(v) => setDraft({ ...draft, isDefault: v })}
                />
                기본 양식으로 설정
              </label>
              <Button type="submit">
                {templates.some((t) => t.id === draft.id) ? '양식 수정' : '새 양식 저장'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {discard && (
        <Modal title="변경 내용을 버릴까요?" onClose={() => setDiscard(false)}>
          <p>저장하지 않은 양식 내용은 사라집니다.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDiscard(false)}>
              계속 작성
            </Button>
            <Button
              onClick={() => {
                setDiscard(false)
                setMode('')
              }}
            >
              변경 내용 버리기
            </Button>
          </div>
        </Modal>
      )}
      {deleteId && (
        <Modal title="양식을 삭제하시겠습니까?" onClose={() => setDeleteId('')}>
          <p>이미 발송된 동의서와 응답은 유지됩니다.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteId('')}>
              취소
            </Button>
            <Button
              onClick={() => {
                setData((d) => ({
                  ...d,
                  consentTemplates: d.consentTemplates.filter((t) => t.id !== deleteId)
                }))
                if (draft.id === deleteId) resetDraft(newTemplate())
                setDeleteId('')
              }}
            >
              삭제
            </Button>
          </div>
        </Modal>
      )}
      {mode === 'log' && (
        <Modal title="동의서 처리 기록" onClose={() => setMode('')}>
          <div className="flex flex-col gap-3">
            {!record.consents.length && <p>기록된 이벤트가 없습니다.</p>}
            {record.consents.flatMap((r) =>
              (r.history ?? []).map((event, i) => (
                <div key={`${r.id}-${i}`} className="rounded-lg border p-3 text-sm">
                  <strong>{event.text}</strong>
                  <p className="my-1 text-slate-500">
                    {pupils.find((s) => s.id === r.studentId)?.name} · {r.title}
                  </p>
                  <time>{new Date(event.at).toLocaleString('ko-KR')}</time>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
