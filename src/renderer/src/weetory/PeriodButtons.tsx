import { Button } from './ui'
import { useWorkspace } from './context'

export function PeriodButtons({
  onSelect
}: {
  onSelect: (start: string, end: string) => void
}): React.JSX.Element {
  const { data, navigate } = useWorkspace()
  const school = data.schools.find((s) => s.id === data.activeSchoolId)
  const periods = school?.timetable ?? []
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs text-slate-500">교시로 입력</span>
      {periods.length ? (
        periods.map((p, i) => (
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-3"
            title={`${p.start} – ${p.end}`}
            key={i}
            onClick={() => onSelect(p.start, p.end)}
          >
            {p.name}
          </Button>
        ))
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/settings#settings-timetable')}
        >
          시간표 등록 후 교시로 입력
        </Button>
      )}
    </div>
  )
}
