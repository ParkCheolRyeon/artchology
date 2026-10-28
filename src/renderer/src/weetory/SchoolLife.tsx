import { useState } from 'react'
import { useWorkspace } from './context'
import { day } from './model'
import { DateInput } from '../components/form-controls'
import { Surface, PageHeading, Field, Badge, Button, Empty } from './ui'

const LUNCHES = [
  ['잡곡밥', '맑은 콩나물국', '닭갈비', '시금치나물', '배추김치', '사과'],
  ['현미밥', '미역국', '두부조림', '달걀말이', '깍두기', '배'],
  ['카레라이스', '유부장국', '채소샐러드', '배추김치', '요구르트'],
  ['보리밥', '감자국', '돼지고기볶음', '오이무침', '배추김치', '귤'],
  ['쌀밥', '잔치국수', '생선구이', '숙주나물', '깍두기', '바나나']
]
export function SchoolLife(): React.JSX.Element {
  const { data, navigate } = useWorkspace()
  const [date, setDate] = useState(day())
  const school = data.schools.find((s) => s.id === data.activeSchoolId)
  const weekday = new Date(`${date}T12:00:00`).getDay()
  const lunch = LUNCHES[weekday - 1]
  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title="학교 생활"
        subtitle={`${school?.name}의 시간표와 점심 메뉴를 살펴보세요.`}
      />
      <div className="wt-grid">
        <Surface className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <h2>학교 시간표</h2>
            <Button variant="secondary" onClick={() => navigate('/settings#settings-timetable')}>
              시간표 설정
            </Button>
          </div>
          <p>선택한 학교의 교시 설정입니다.</p>
          {!school?.timetable?.length && (
            <Empty
              title="등록된 시간표가 없습니다"
              description="시간표 설정에서 교시를 등록해 주세요."
            />
          )}
          <div className="divide-y">
            {(school?.timetable ?? []).map((t, i) => (
              <div className="flex items-center justify-between gap-4 py-4 text-sm" key={i}>
                <strong>{t.name}</strong>
                <span>
                  {t.start} – {t.end}
                </span>
              </div>
            ))}
          </div>
        </Surface>
        <Surface className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <h2>점심 메뉴</h2>
            <Badge tone="amber">예시 식단</Badge>
          </div>
          <Field label="급식 날짜">
            <DateInput value={date} onValueChange={setDate} />
          </Field>
          <Button className="self-start" variant="ghost" onClick={() => setDate(day())}>
            오늘
          </Button>
          <p className="wt-note">
            급식 API 연결 전입니다. 실제 학교 식단·알레르기 정보가 아닌 시연 자료입니다.
          </p>
          {lunch ? (
            <ul className="space-y-3">
              {lunch.map((food) => (
                <li key={food}>{food}</li>
              ))}
            </ul>
          ) : (
            <Empty
              title="급식 정보가 없습니다"
              description="주말에는 예시 식단을 제공하지 않습니다."
            />
          )}
        </Surface>
      </div>
    </div>
  )
}
