import type { Drawing } from '../../../shared/model'
export interface School {
  id: string
  name: string
  type: string
  weeClass: string
  phone: string
  archived: boolean
}
export interface Enrollment {
  year: number
  grade: number
  classroom: string
  number: number
  status: '재학' | '졸업' | '전출'
}
export interface Pupil {
  id: string
  schoolId: string
  name: string
  gender: '남' | '여' | '미입력'
  contact: string
  guardianName: string
  guardianRelation: string
  guardianContact: string
  enrollments: Enrollment[]
}
export interface Concept {
  id: string
  title: string
  template: string
  fields: Record<string, string>
  date: string
}
export interface Consent {
  id: string
  title: string
  studentId: string
  status: '작성 중' | '발송 대기' | '동의' | '미동의'
  date: string
  body: string
}
export interface CaseRecord {
  id: string
  schoolId: string
  year: number
  number: string
  studentIds: string[]
  complaint: string
  goal: string
  teacherOpinion: string
  notes: string
  referrer: string
  referrerRole: string
  referrerContact: string
  status: '진행' | '종결'
  createdAt: string
  closedAt: string
  closeReason: string
  concepts: Concept[]
  consents: Consent[]
}
export interface Meeting {
  id: string
  schoolId: string
  caseId: string
  studentIds: string[]
  title: string
  start: string
  end: string
  allDay: boolean
  category: string
  categoryMedium: string
  categoryDetail: string
  counselingClass: string
  weeClass: string
  medium: string
  target: string
  crisis: string
  counselorAffiliation: string
  neisTitle: string
  neisContent: string
  internalNotes: string
  status: '예정' | '완료'
  reminder: number
  color: string
  location: string
}
export interface Preferences {
  counselor: string
  email: string
  phone: string
  schoolYear: number
  theme: string
  autoLock: number
  pin: string
  autoBackup: boolean
  backupTime: string
  backupRetention: number
  documentFolder: string
  timetable: { name: string; start: string; end: string }[]
}
export interface Archive {
  id: string
  schoolId: string
  year: number
  title: string
  state: '작성 중' | '확정' | '이관 완료'
  recipient: string
  date: string
  memo: string
}
export interface NumberChange {
  id: string
  date: string
  description: string
  before: Record<string, string>
  after: Record<string, string>
}
export interface WorkspaceData {
  drawings: (Drawing & { schoolId: string })[]
  students: Pupil[]
  cases: CaseRecord[]
  sessions: Meeting[]
  schools: School[]
  activeSchoolId: string
  settings: Preferences
  archives: Archive[]
  numberHistory: NumberChange[]
  numberPattern: string
  templates: { id: string; name: string; fields: string[] }[]
}
export const uid = (): string => crypto.randomUUID()
export const day = (value = new Date()): string =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
export const CATEGORIES = [
  '개인상담',
  '집단상담',
  '심리검사',
  '교육',
  '자문',
  '연구',
  '기타'
] as const
export const TOPICS = [
  '학교생활',
  '또래 관계',
  '학업·진로',
  '정서·심리',
  '가족 관계',
  '행동·습관',
  '위기 상담',
  '기타'
] as const
export const REPORT_TABS = [
  '나이스 엑셀 내보내기',
  '상담관리대장',
  '관리자 보고서',
  '기록물 보관·이관'
] as const
export const STAT_TABS = ['요약', '상담 분류', '시간 흐름', '유입·종결'] as const
export const SETTING_TABS = [
  '기본 정보',
  '학교 관리',
  '시간표(교시)',
  '보안 설정',
  '백업 · 복원',
  '자동 백업',
  '구독 · 계정',
  '문서 폴더',
  '공공데이터 출처'
] as const
export const HOME_TABS = [
  '오늘의 상담',
  '캘린더',
  '사례 현황',
  '장기 미접촉',
  '최근 기록',
  '기록물 보관',
  '마음 그리기'
] as const
export function createDemo(): WorkspaceData {
  const today = day(),
    year = new Date().getFullYear(),
    schoolId = 'school-1'
  const names = ['김하늘', '이서준', '박지우', '최도윤', '정수아', '윤민재', '한예린', '오시우']
  const students: Pupil[] = names.map((name, i) => ({
    id: `student-${i + 1}`,
    schoolId,
    name,
    gender: i % 2 ? '남' : '여',
    contact: '',
    guardianName: '',
    guardianRelation: '모',
    guardianContact: '',
    enrollments: [
      { year, grade: (i % 3) + 1, classroom: String((i % 4) + 1), number: i + 3, status: '재학' }
    ]
  }))
  const cases: CaseRecord[] = students.slice(0, 6).map((s, i) => ({
    id: `case-${i + 1}`,
    schoolId,
    year,
    number: `${year}-${String(i + 1).padStart(3, '0')}`,
    studentIds: [s.id],
    complaint: [
      '친구와의 관계에서 느끼는 어려움',
      '새 학기에 느끼는 긴장과 감정',
      '나의 강점과 진로 탐색'
    ][i % 3],
    goal: '자신의 감정을 알아차리고 편안하게 표현하기',
    teacherOpinion: '교실에서의 변화를 함께 살펴봅니다.',
    notes: '',
    referrer: '담임교사',
    referrerRole: '교사',
    referrerContact: '',
    status: i === 5 ? '종결' : '진행',
    createdAt: `${year}-09-01`,
    closedAt: i === 5 ? today : '',
    closeReason: i === 5 ? '목표 달성' : '',
    concepts: [],
    consents: []
  }))
  const sessions: Meeting[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + (i < 4 ? 0 : -i))
    const date = day(d),
      hour = 9 + (i % 6)
    return {
      id: `session-${i + 1}`,
      schoolId,
      caseId: cases[i % 6].id,
      studentIds: cases[i % 6].studentIds,
      title: ['친구와 마음 나누기', '한 주의 감정 돌아보기', '나의 강점 찾아보기'][i % 3],
      start: `${date}T${String(hour).padStart(2, '0')}:00`,
      end: `${date}T${String(hour).padStart(2, '0')}:40`,
      allDay: false,
      category: '개인상담',
      categoryMedium: TOPICS[i % TOPICS.length],
      categoryDetail: '일반 상담',
      counselingClass: '상담',
      weeClass: 'Wee클래스',
      medium: '대면',
      target: '학생',
      crisis: '해당 없음',
      counselorAffiliation: '학교',
      neisTitle: '학생 개인상담',
      neisContent: '학교생활과 또래 관계에 관한 상담',
      internalNotes:
        i < 4 ? '' : '지난주에 있었던 일을 함께 돌아보며 그때의 감정을 이야기했습니다.',
      status: i < 4 ? '예정' : '완료',
      reminder: 10,
      color: '#3196ff',
      location: '상담실'
    }
  })
  const start = new Date()
  start.setDate(start.getDate() + 2)
  const end = new Date(start)
  end.setDate(end.getDate() + 3)
  sessions.push({
    ...sessions[0],
    id: 'session-multi',
    title: '마음 돌봄 주간',
    start: day(start),
    end: day(end),
    allDay: true,
    category: '교육',
    color: '#8e7bc3'
  })
  return {
    drawings: [],
    students,
    cases,
    sessions,
    schools: [
      {
        id: schoolId,
        name: '아트봄 초등학교',
        type: '초등학교',
        weeClass: 'Wee클래스',
        phone: '',
        archived: false
      }
    ],
    activeSchoolId: schoolId,
    settings: {
      counselor: '김선생',
      email: '',
      phone: '',
      schoolYear: year,
      theme: '라이트',
      autoLock: 15,
      pin: '',
      autoBackup: false,
      backupTime: '17:00',
      backupRetention: 30,
      documentFolder: '문서 / 위토리',
      timetable: [
        { name: '1교시', start: '09:00', end: '09:40' },
        { name: '2교시', start: '09:50', end: '10:30' },
        { name: '3교시', start: '10:40', end: '11:20' },
        { name: '4교시', start: '11:30', end: '12:10' },
        { name: '5교시', start: '13:00', end: '13:40' },
        { name: '6교시', start: '13:50', end: '14:30' }
      ]
    },
    archives: [],
    numberHistory: [],
    numberPattern: '학년도-일련번호',
    templates: [
      {
        id: '5p',
        name: '5P 사례개념화',
        fields: ['현재 문제', '선행 요인', '촉발 요인', '유지 요인', '보호 요인']
      },
      {
        id: 'cbt',
        name: 'CBT 인지행동',
        fields: ['상황', '자동적 사고', '감정과 행동', '핵심 신념', '개입 계획']
      },
      {
        id: 'sfbt',
        name: '해결중심 상담',
        fields: ['바라는 변화', '예외 경험', '강점과 자원', '작은 다음 단계']
      },
      {
        id: 'wee',
        name: 'Wee 학교상담',
        fields: ['주호소', '학교·가정 환경', '상담 목표', '개입 계획', '평가']
      }
    ]
  }
}
