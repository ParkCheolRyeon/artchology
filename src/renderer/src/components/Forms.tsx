import { errorMessage } from '../format'
import { useState, type FormEvent } from 'react'
import { Check, CalendarDays } from 'lucide-react'
import {
  CATEGORIES,
  STATUSES,
  localDate,
  type Student,
  type StudentInput,
  type Session,
  type SessionInput
} from '../../../shared/model'
import { Button, Field, Modal } from './ui'

export function StudentForm({
  student,
  onClose,
  onSave
}: {
  student?: Student
  onClose: () => void
  onSave: (value: StudentInput) => Promise<void>
}): React.JSX.Element {
  const [dirty, setDirty] = useState(false)
  function requestClose(): void {
    if (!dirty || window.confirm('저장하지 않은 변경 내용이 있습니다. 닫을까요?')) onClose()
  }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    const category = CATEGORIES.find((value) => value === data.get('category'))
    const status = STATUSES.find((value) => value === data.get('status'))
    if (!category || !status) {
      setError('분류와 상태를 선택하세요.')
      setBusy(false)
      return
    }
    try {
      await onSave({
        id: student?.id,
        name: String(data.get('name')),
        grade: Number(data.get('grade')),
        classroom: Number(data.get('classroom')),
        number: Number(data.get('number')),
        category,
        status,
        concern: String(data.get('concern')),
        guardian: String(data.get('guardian')),
        phone: String(data.get('phone'))
      })
      onClose()
    } catch (error) {
      setError(errorMessage(error))
      setBusy(false)
    }
  }
  return (
    <Modal
      title={student ? '학생 정보 수정' : '새 학생 등록'}
      subtitle="학생을 알아가는 첫 기록을 남겨주세요."
      onClose={requestClose}
      busy={busy}
    >
      <form onSubmit={submit} onChange={() => setDirty(true)}>
        <fieldset disabled={busy} className="form-grid">
          <Field label="학생 이름 *">
            <input
              name="name"
              required
              maxLength={40}
              autoFocus
              defaultValue={student?.name}
              placeholder="이름을 입력하세요"
            />
          </Field>
          <Field label="상담 상태">
            <select name="status" defaultValue={student?.status ?? '진행 중'}>
              {STATUSES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <div className="form-triple field-full">
            <Field label="학년">
              <input
                name="grade"
                type="number"
                min={1}
                max={6}
                required
                defaultValue={student?.grade ?? 1}
              />
            </Field>
            <Field label="반">
              <input
                name="classroom"
                type="number"
                min={1}
                max={30}
                required
                defaultValue={student?.classroom ?? 1}
              />
            </Field>
            <Field label="번호">
              <input
                name="number"
                type="number"
                min={1}
                max={60}
                required
                defaultValue={student?.number ?? 1}
              />
            </Field>
          </div>
          <Field label="주요 상담 주제" full>
            <select name="category" defaultValue={student?.category ?? CATEGORIES[0]}>
              {CATEGORIES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="보호자 이름">
            <input
              name="guardian"
              maxLength={80}
              defaultValue={student?.guardian}
              placeholder="선택 입력"
            />
          </Field>
          <Field label="보호자 연락처">
            <input
              name="phone"
              maxLength={30}
              defaultValue={student?.phone}
              placeholder="선택 입력"
            />
          </Field>
          <Field label="상담 배경 및 메모" full>
            <textarea
              name="concern"
              rows={4}
              maxLength={2000}
              defaultValue={student?.concern}
              placeholder="학생에 대해 알아두면 좋을 내용을 기록하세요."
            />
          </Field>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <Button type="button" variant="secondary" disabled={busy} onClick={requestClose}>
            취소
          </Button>
          <Button type="submit" disabled={busy}>
            <Check size={16} />
            {busy ? '저장 중…' : student ? '변경 저장' : '학생 등록'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
export function SessionForm({
  students,
  session,
  studentId,
  scheduledDate,
  onClose,
  onSave
}: {
  students: Student[]
  session?: Session
  studentId?: string
  scheduledDate?: string
  onClose: () => void
  onSave: (value: SessionInput) => Promise<void>
}): React.JSX.Element {
  const [dirty, setDirty] = useState(false)
  function requestClose(): void {
    if (!dirty || window.confirm('저장하지 않은 변경 내용이 있습니다. 닫을까요?')) onClose()
  }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [state, setState] = useState<'예정' | '완료'>(
    session?.state ?? (scheduledDate ? '예정' : '완료')
  )
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    const category = CATEGORIES.find((value) => value === data.get('category'))
    if (!category) {
      setError('상담 분류를 선택하세요.')
      setBusy(false)
      return
    }
    try {
      await onSave({
        id: session?.id,
        studentId: String(data.get('studentId')),
        date: String(data.get('date')),
        time: String(data.get('time')),
        duration: Number(data.get('duration')),
        category,
        state,
        title: String(data.get('title')),
        note: String(data.get('note')),
        nextPlan: String(data.get('nextPlan'))
      })
      onClose()
    } catch (error) {
      setError(errorMessage(error))
      setBusy(false)
    }
  }
  return (
    <Modal
      title={session ? '상담 기록 보기 · 수정' : '상담 기록 작성'}
      subtitle="작은 변화도 놓치지 않도록, 오늘의 이야기를 남겨주세요."
      onClose={requestClose}
      busy={busy}
    >
      <form onSubmit={submit} onChange={() => setDirty(true)}>
        <fieldset disabled={busy} className="form-grid">
          <Field label="학생 *">
            <select name="studentId" required defaultValue={session?.studentId ?? studentId ?? ''}>
              <option value="" disabled>
                학생 선택
              </option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.grade}학년 {student.classroom}반
                </option>
              ))}
            </select>
          </Field>
          <Field label="상담 상태">
            <select
              value={state}
              onChange={(event) => setState(event.target.value === '예정' ? '예정' : '완료')}
            >
              <option>완료</option>
              <option>예정</option>
            </select>
          </Field>
          <div className="form-triple field-full">
            <Field label="상담 날짜 *">
              <input
                name="date"
                type="date"
                required
                defaultValue={session?.date ?? scheduledDate ?? localDate()}
              />
            </Field>
            <Field label="시작 시간 *">
              <input name="time" type="time" required defaultValue={session?.time ?? '09:00'} />
            </Field>
            <Field label="상담 시간 (분)">
              <input
                name="duration"
                type="number"
                required
                min={10}
                max={180}
                defaultValue={session?.duration ?? 40}
              />
            </Field>
          </div>
          <Field label="상담 분류">
            <select name="category" defaultValue={session?.category ?? CATEGORIES[0]}>
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
          <Field label="상담 제목 *">
            <input
              name="title"
              required
              maxLength={100}
              defaultValue={session?.title}
              placeholder="오늘의 상담 주제"
            />
          </Field>
          <Field label={state === '완료' ? '상담 내용 *' : '상담 준비 메모'} full>
            <textarea
              name="note"
              rows={6}
              required={state === '완료'}
              maxLength={20000}
              defaultValue={session?.note}
              placeholder="학생의 이야기, 관찰한 반응, 함께 나눈 내용을 자유롭게 적어주세요."
            />
          </Field>
          <Field label="다음 상담 계획" full>
            <textarea
              name="nextPlan"
              rows={2}
              maxLength={2000}
              defaultValue={session?.nextPlan}
              placeholder="다음에 함께 살펴보고 싶은 것은 무엇인가요?"
            />
          </Field>
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <Button type="button" variant="secondary" disabled={busy} onClick={requestClose}>
            취소
          </Button>
          <Button type="submit" disabled={busy}>
            <CalendarDays size={16} />
            {busy ? '저장 중…' : '상담 저장'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
