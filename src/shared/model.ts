import { z } from 'zod'

export const APP = {
  name: 'Artchology',
  id: 'com.artchology.demo',
  database: 'artchology-demo.json'
} as const
export const CATEGORIES = ['또래 관계', '정서·감정', '학습·진로', '가족 관계', '학교 적응'] as const
export const STATUSES = ['진행 중', '관찰 중', '종결'] as const
export const ACTIVITIES = [
  {
    id: 'weather',
    name: '오늘의 마음 날씨',
    description: '지금 내 마음은 어떤 날씨인가요?',
    guide: '맑음, 흐림, 비… 오늘의 마음을 날씨로 표현해 보세요. 어떤 색과 모양이어도 괜찮아요.',
    color: '#edf5ff',
    duration: '10분',
    kind: '감정 표현'
  },
  {
    id: 'garden',
    name: '나만의 마음 정원',
    description: '나를 편안하게 하는 것들을 심어 보세요.',
    guide: '나를 기쁘게 하는 것, 내가 좋아하는 사람, 쉬고 싶은 공간을 정원에 그려 보세요.',
    color: '#f2f6fb',
    duration: '15분',
    kind: '자기 탐색'
  },
  {
    id: 'island',
    name: '안전한 나의 섬',
    description: '마음 놓고 쉴 수 있는 곳을 상상해요.',
    guide:
      '누구와 함께 있고 싶은가요? 무엇이 있으면 좋을까요? 나만의 안전한 섬을 자유롭게 그려 보세요.',
    color: '#e5f1ff',
    duration: '15분',
    kind: '안정감 찾기'
  }
] as const
export const localDate = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const text = z.string().trim().max(2000)
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00`)
    return !Number.isNaN(parsed.getTime()) && localDate(parsed) === value
  }, '올바른 날짜를 입력하세요.')
export const studentInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(40),
  grade: z.number().int().min(1).max(6),
  classroom: z.number().int().min(1).max(30),
  number: z.number().int().min(1).max(60),
  category: z.enum(CATEGORIES),
  status: z.enum(STATUSES),
  concern: text,
  guardian: z.string().trim().max(80),
  phone: z.string().trim().max(30)
})
export const studentSchema = studentInput.extend({ id: z.string(), createdAt: z.string() })
export const sessionInput = z
  .object({
    id: z.string().optional(),
    studentId: z.string().min(1),
    date,
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    duration: z.number().int().min(10).max(180),
    category: z.enum(CATEGORIES),
    state: z.enum(['예정', '완료']),
    title: z.string().trim().min(1).max(100),
    note: z.string().trim().max(20000),
    nextPlan: text
  })
  .refine(
    (value) => value.state !== '완료' || value.note.length > 0,
    '완료된 상담에는 기록 내용을 입력하세요.'
  )
export const sessionSchema = sessionInput.safeExtend({ id: z.string() })
export const drawingInput = z.object({
  studentId: z.string().min(1),
  activityId: z.enum(['weather', 'garden', 'island']),
  image: z
    .string()
    .max(5_000_000)
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/),
  reflection: text
})
export const drawingSchema = drawingInput.extend({ id: z.string(), createdAt: z.string() })
export const settingsSchema = z.object({
  school: z.string().trim().min(1).max(60),
  counselor: z.string().trim().min(1).max(40)
})
export const storeSchema = z.object({
  version: z.literal(1),
  students: z.array(studentSchema),
  sessions: z.array(sessionSchema),
  drawings: z.array(drawingSchema),
  settings: settingsSchema
})
export type Student = z.infer<typeof studentSchema>
export type StudentInput = z.infer<typeof studentInput>
export type Session = z.infer<typeof sessionSchema>
export type SessionInput = z.infer<typeof sessionInput>
export type Drawing = z.infer<typeof drawingSchema>
export type DrawingInput = z.infer<typeof drawingInput>
export type Settings = z.infer<typeof settingsSchema>
export type Store = z.infer<typeof storeSchema>
export type Result<T> = { ok: true; data: T } | { ok: false; error: string }
export interface DesktopAPI {
  load: () => Promise<Result<Store>>
  saveStudent: (input: StudentInput) => Promise<Result<Store>>
  saveSession: (input: SessionInput) => Promise<Result<Store>>
  saveDrawing: (input: DrawingInput) => Promise<Result<Store>>
  saveSettings: (input: Settings) => Promise<Result<Store>>
  exportFile: (kind: ExportKind, filter?: ReportFilter) => Promise<Result<string | null>>
  selectBackup: () => Promise<Result<Store | null>>
  restoreBackup: () => Promise<Result<Store>>
}
export const IPC = {
  load: 'data:load',
  student: 'data:student',
  session: 'data:session',
  drawing: 'data:drawing',
  settings: 'data:settings',
  export: 'data:export',
  selectBackup: 'data:backup-select',
  restoreBackup: 'data:backup-restore'
} as const

export const reportFilterSchema = z
  .object({
    from: date.optional(),
    to: date.optional(),
    studentId: z.string().min(1).optional(),
    state: z.enum(['예정', '완료']).optional()
  })
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    '시작일은 종료일보다 늦을 수 없습니다.'
  )
export type ReportFilter = z.infer<typeof reportFilterSchema>
export type ExportKind = 'backup' | 'sessions' | 'report'
export function filterSessions(sessions: Session[], filter: ReportFilter): Session[] {
  return sessions
    .filter(
      (row) =>
        (!filter.from || row.date >= filter.from) &&
        (!filter.to || row.date <= filter.to) &&
        (!filter.studentId || row.studentId === filter.studentId) &&
        (!filter.state || row.state === filter.state)
    )
    .toSorted((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
}
