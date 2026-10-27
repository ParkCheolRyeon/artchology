import { CATEGORIES, localDate, type Store } from '../../shared/model'

export function createSeed(): Store {
  const today = localDate()
  const names = ['김하늘', '이서준', '박지우', '최도윤', '정수아', '윤민재', '한예린', '오시우']
  const concerns = [
    '친구에게 마음을 표현하는 연습을 하고 있어요.',
    '새 학기에 느끼는 긴장과 감정을 살펴봅니다.',
    '스스로 좋아하는 것과 잘하는 것을 찾아갑니다.',
    '가족과 나누고 싶은 이야기를 정리합니다.',
    '학교에서 편안한 순간을 늘려가고 있어요.'
  ]
  const students: Store['students'] = names.map((name, index) => ({
    id: `demo-student-${index + 1}`,
    name,
    grade: (index % 3) + 1,
    classroom: (index % 4) + 1,
    number: index + 3,
    category: CATEGORIES[index % CATEGORIES.length],
    status: index === 6 ? '종결' : index === 4 ? '관찰 중' : '진행 중',
    concern: concerns[index % concerns.length],
    guardian: '',
    phone: '',
    createdAt: today
  }))
  const sessions: Store['sessions'] = students.slice(0, 3).map((student, index) => ({
    id: `demo-upcoming-${index}`,
    studentId: student.id,
    date: today,
    time: ['09:40', '11:00', '14:20'][index],
    duration: 40,
    category: student.category,
    state: '예정',
    title: ['친구와 마음 나누기', '한 주의 감정 돌아보기', '나의 강점 찾아보기'][index],
    note: '',
    nextPlan: ''
  }))
  for (let index = 0; index < 12; index++) {
    const day = new Date()
    day.setDate(day.getDate() - 1 - index * 2)
    const student = students[index % students.length]
    sessions.push({
      id: `demo-history-${index}`,
      studentId: student.id,
      date: localDate(day),
      time: '10:00',
      duration: 40,
      category: student.category,
      state: '완료',
      title: ['나의 마음 알아차리기', '친구와의 관계 살펴보기', '일상에서 찾은 작은 변화'][
        index % 3
      ],
      note: '지난주에 있었던 일을 함께 돌아보며 그때의 감정을 이야기했습니다. 학생이 편안하게 표현할 수 있도록 충분한 시간을 두고 들었습니다.\n\n자신이 좋아하는 활동에 관해 이야기할 때 표정이 밝아졌습니다.',
      nextPlan: '다음 시간에는 마음을 그림으로 표현하는 활동을 함께 진행합니다.'
    })
  }
  return {
    version: 1,
    students,
    sessions,
    drawings: [],
    settings: { school: '아트봄 초등학교', counselor: '김선생' }
  }
}
