import { toast } from '../lib/toast'
import { Tabs, Modal } from './ui'
import { useWorkspace } from './context'
import { uid } from './model'
import { FormSelect } from '../components/form-controls'
import { Textarea } from '../components/ui/textarea'
import { errorMessage } from '../format'
import { useRef, useState, type PointerEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eraser,
  Paintbrush,
  RotateCcw,
  Undo2,
  Palette
} from 'lucide-react'
import { ACTIVITIES, type Drawing } from '../../../shared/model'
import { Button, Empty, Field, PageHeading } from '../components/ui'

type Point = { x: number; y: number }
type Stroke = { points: Point[]; color: string; width: number }
const COLORS = ['#344e41', '#728f6e', '#e4ad5b', '#d77d78', '#85a7bf', '#a58ab7', '#34383b']
const CANVAS = { width: 1000, height: 650 }
function paint(canvas: HTMLCanvasElement, strokes: Stroke[]): void {
  const context = canvas.getContext('2d')
  if (!context) return
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, CANVAS.width, CANVAS.height)
  for (const stroke of strokes) {
    const first = stroke.points[0]
    if (!first) continue
    context.strokeStyle = stroke.color
    context.lineWidth = stroke.width
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(first.x, first.y)
    for (const point of stroke.points.slice(1)) context.lineTo(point.x, point.y)
    if (stroke.points.length === 1) context.lineTo(first.x + 0.1, first.y)
    context.stroke()
  }
}
export function ArtStudio(): React.JSX.Element {
  const { data, setData, notify } = useWorkspace()
  const students = data.students.filter((s) => s.schoolId === data.activeSchoolId)
  const [view, setView] = useState('활동 둘러보기')
  const [activity, setActivity] = useState<(typeof ACTIVITIES)[number] | null>(null)
  const [studentId, setStudentId] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [width, setWidth] = useState(6)
  const [eraser, setEraser] = useState(false)
  const [reflection, setReflection] = useState('')
  const [busy, setBusy] = useState(false)

  const [confirm, setConfirm] = useState<'leave' | 'clear' | null>(null)
  const [count, setCount] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Stroke[]>([])
  const active = useRef<number | null>(null)
  function position(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) * CANVAS.width) / rect.width,
      y: ((event.clientY - rect.top) * CANVAS.height) / rect.height
    }
  }
  function drawStart(event: PointerEvent<HTMLCanvasElement>): void {
    if (active.current !== null || busy || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    active.current = event.pointerId
    strokes.current.push({
      points: [position(event)],
      color: eraser ? '#ffffff' : color,
      width: eraser ? width * 4 : width
    })
    setCount(strokes.current.length)
    paint(event.currentTarget, strokes.current)
  }
  function drawMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (active.current !== event.pointerId || busy) return
    strokes.current[strokes.current.length - 1].points.push(position(event))
    paint(event.currentTarget, strokes.current)
  }
  function redraw(): void {
    setCount(strokes.current.length)
    if (canvasRef.current) paint(canvasRef.current, strokes.current)
  }
  async function storeDrawing(): Promise<void> {
    if (!activity || !canvasRef.current || !studentId || !count) return
    setBusy(true)

    try {
      const drawing = {
        id: uid(),
        schoolId: data.activeSchoolId,
        createdAt: new Date().toISOString(),
        studentId,
        activityId: activity.id,
        image: canvasRef.current.toDataURL('image/png'),
        reflection
      }
      setData((previous) => ({ ...previous, drawings: [...previous.drawings, drawing] }))
      notify('마음 그림과 메모를 작품 보관함에 저장했습니다.', 'success')
      setBusy(false)
      setActivity(null)
      setView('작품 보관함')
    } catch (error) {
      toast.error(errorMessage(error))
      setBusy(false)
    }
  }
  if (!activity)
    return (
      <div className="wt-art-studio">
        <PageHeading
          title="마음 그리기"
          subtitle="아이의 이야기가 그림으로 피어나는 시간, 아트봉봉과 함께하세요."
        />
        <Tabs
          items={['활동 둘러보기', '작품 보관함']}
          value={view}
          onChange={setView}
          label="마음 그리기 하위 메뉴"
        />
        {view === '작품 보관함' ? (
          <DrawingGallery />
        ) : (
          <>
            <div className="studio-intro">
              <span className="art-brand">artbonbon</span>
              <h2>
                어떤 마음이든,
                <br />
                여기서는 자유롭게.
              </h2>
              <p>
                잘 그리는 것보다 자신을 표현하는 경험이 중요해요.
                <br />
                오늘 함께하고 싶은 활동을 골라주세요.
              </p>
              <div className="intro-art" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="activity-grid">
              {ACTIVITIES.map((item, index) => (
                <button
                  key={item.id}
                  className="activity-card"
                  onClick={() => {
                    setActivity(item)
                    strokes.current = []
                    setCount(0)
                    setReflection('')
                  }}
                >
                  <div
                    className={`activity-picture activity-picture-${index}`}
                    style={{ background: item.color }}
                  >
                    <div className="art-shape a" />
                    <div className="art-shape b" />
                    <div className="art-shape c" />
                    <span>{index === 0 ? '☀' : index === 1 ? '✿' : '≈'}</span>
                  </div>
                  <div className="activity-card-copy">
                    <span className="activity-kind">
                      {item.kind} · 약 {item.duration}
                    </span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <span className="activity-start">
                      활동 시작
                      <ArrowRight size={17} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="studio-note">
              시연용 표현 활동입니다. 심리검사나 AI 분석 결과를 제공하지 않습니다.
            </p>
          </>
        )}
      </div>
    )
  if (!students.length)
    return (
      <Empty
        title="먼저 학생을 등록해 주세요"
        description="활동 결과를 학생의 기록에 연결합니다."
        action={<Button onClick={() => setActivity(null)}>활동 목록으로</Button>}
      />
    )
  return (
    <div className="wt-art-studio">
      <button
        className="back-link"
        disabled={busy}
        onClick={() => {
          if (count || reflection.trim()) setConfirm('leave')
          else setActivity(null)
        }}
      >
        <ArrowLeft size={16} />
        활동 목록
      </button>
      <PageHeading title={activity.name} subtitle={activity.guide}>
        <Button disabled={busy || !studentId || !count} onClick={() => void storeDrawing()}>
          <Check size={16} />
          {busy ? '저장 중…' : '활동 저장'}
        </Button>
      </PageHeading>
      <div className="studio-workspace">
        <section className="canvas-area">
          <div className="drawing-tools">
            <button
              aria-label="붓"
              aria-pressed={!eraser}
              className={!eraser ? 'tool-active' : ''}
              onClick={() => setEraser(false)}
            >
              <Paintbrush size={19} />
            </button>
            <button
              aria-label="지우개"
              aria-pressed={eraser}
              className={eraser ? 'tool-active' : ''}
              onClick={() => setEraser(true)}
            >
              <Eraser size={19} />
            </button>
            <span className="tool-divider" />
            {COLORS.map((value) => (
              <button
                key={value}
                aria-label={`${value} 색상`}
                aria-pressed={color === value && !eraser}
                className={`color-dot ${color === value && !eraser ? 'chosen' : ''}`}
                style={{ background: value }}
                onClick={() => {
                  setColor(value)
                  setEraser(false)
                }}
              />
            ))}
            <span className="tool-divider" />
            <input
              aria-label="붓 크기"
              type="range"
              min={2}
              max={24}
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
            />
            <button
              disabled={!count || busy}
              aria-label="되돌리기"
              onClick={() => {
                strokes.current.pop()
                redraw()
              }}
            >
              <Undo2 size={18} />
            </button>
            <button
              disabled={!count || busy}
              aria-label="그림 지우기"
              onClick={() => setConfirm('clear')}
            >
              <RotateCcw size={18} />
            </button>
          </div>
          <canvas
            ref={(canvas) => {
              canvasRef.current = canvas
              if (canvas) paint(canvas, strokes.current)
            }}
            width={CANVAS.width}
            height={CANVAS.height}
            aria-label="마음 그리기 캔버스"
            onPointerDown={drawStart}
            onPointerMove={drawMove}
            onPointerUp={() => {
              active.current = null
            }}
            onPointerCancel={() => {
              active.current = null
            }}
            onLostPointerCapture={() => {
              active.current = null
            }}
          />
          <div className="canvas-footer">
            <Palette size={14} />
            마우스나 펜으로 자유롭게 그려보세요.
          </div>
        </section>
        <aside className="surface activity-notes">
          <h3>함께 나눈 이야기</h3>
          <Field label="참여 학생 *">
            <FormSelect disabled={busy} value={studentId} onValueChange={setStudentId}>
              <option value="">학생 선택</option>
              {students.map((student) => (
                <option value={student.id} key={student.id}>
                  {student.name} ·{' '}
                  {student.enrollments.find((e) => e.year === data.settings.schoolYear)?.grade ??
                    '학적 미등록'}
                </option>
              ))}
            </FormSelect>
          </Field>
          <Field label="학생의 설명과 관찰 메모">
            <Textarea
              disabled={busy}
              rows={9}
              maxLength={2000}
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              placeholder="그림에 대해 학생이 들려준 이야기를 남겨주세요."
            />
          </Field>
          <p>저장한 그림과 메모는 작품 보관함에서 다시 볼 수 있어요.</p>
        </aside>
      </div>
      {confirm && (
        <Modal
          title={confirm === 'clear' ? '그림을 모두 지울까요?' : '활동 목록으로 돌아갈까요?'}
          subtitle={
            confirm === 'clear'
              ? '현재 캔버스의 그림이 지워집니다.'
              : '저장하지 않은 그림과 메모는 사라집니다.'
          }
          onClose={() => setConfirm(null)}
        >
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              계속 그리기
            </Button>
            <Button
              onClick={() => {
                if (confirm === 'clear') {
                  strokes.current = []
                  redraw()
                } else setActivity(null)
                setConfirm(null)
              }}
            >
              {confirm === 'clear' ? '그림 지우기' : '활동 목록으로'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function DrawingGallery(): React.JSX.Element {
  const { data } = useWorkspace()
  const [selected, setSelected] = useState<Drawing | null>(null)
  const [student, setStudent] = useState('all')
  const students = data.students.filter((s) => s.schoolId === data.activeSchoolId)
  const drawings = data.drawings
    .filter(
      (d) => d.schoolId === data.activeSchoolId && (student === 'all' || d.studentId === student)
    )
    .toReversed()
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-muted-foreground">함께 그린 마음 그림 {drawings.length}점</p>
        <div className="w-56">
          <Field label="참여 학생 필터">
            <FormSelect value={student} onValueChange={setStudent}>
              <option value="all">전체 학생</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </FormSelect>
          </Field>
        </div>
      </div>
      {drawings.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {drawings.map((d) => {
            const activity = ACTIVITIES.find((a) => a.id === d.activityId)
            const name = students.find((s) => s.id === d.studentId)?.name ?? '학생'
            return (
              <button
                key={d.id}
                className="overflow-hidden rounded-xl border bg-white text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setSelected(d)}
              >
                <img
                  src={d.image}
                  alt={`${name}의 ${activity?.name}`}
                  className="aspect-[1000/650] w-full border-b object-contain"
                />
                <div className="space-y-2 p-5">
                  <h3 className="font-semibold">{activity?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {name} · {new Date(d.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                  <p className="line-clamp-2 text-sm">{d.reflection || '남긴 메모가 없습니다.'}</p>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <Empty
          title="아직 저장한 마음 그림이 없어요"
          description="활동을 골라 학생의 첫 마음 그림을 남겨보세요."
        />
      )}
      {selected && (
        <Modal
          title={ACTIVITIES.find((a) => a.id === selected.activityId)?.name ?? '마음 그림'}
          onClose={() => setSelected(null)}
        >
          <img src={selected.image} alt="저장한 마음 그림" className="w-full rounded-lg border" />
          <div className="space-y-3">
            <h3 className="font-semibold">함께 나눈 이야기</h3>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {selected.reflection || '남긴 메모가 없습니다.'}
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
