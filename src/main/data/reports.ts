import { CATEGORIES, type ReportFilter, type Session, type Store } from '../../shared/model'

export function sessionCsv(data: Store, rows: Session[]): string {
  const cell = (value: string): string =>
    `"${(/^[\s]*[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`
  return (
    '\uFEFF' +
    [
      ['날짜', '시간', '학생', '상담 분류', '상태', '상담 제목', '상세 기록', '다음 계획'],
      ...rows.map((row) => [
        row.date,
        row.time,
        data.students.find((student) => student.id === row.studentId)?.name ?? '',
        row.category,
        row.state,
        row.title,
        row.note,
        row.nextPlan
      ])
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  )
}

export function reportHtml(data: Store, rows: Session[], filter: ReportFilter): string {
  const escape = (text: string): string =>
    text.replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
    )
  const completed = rows.filter((row) => row.state === '완료')
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>
    body{font-family:Arial,sans-serif;color:#263445;font-size:12px;padding:24px}h1{font-size:26px}h2{margin-top:28px;font-size:18px}p{line-height:1.7}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #dce3ea;text-align:left;padding:10px}thead{display:table-header-group}tr{break-inside:avoid}.note{color:#657488;font-size:11px}
    </style></head><body><h1>상담 운영 보고서</h1><p>${escape(data.settings.school)} · ${escape(data.settings.counselor)}</p>
    <p>기간: ${escape(filter.from || '전체 기록')} ~ ${escape(filter.to || '현재')} · 상태: ${escape(filter.state || '전체')}</p><p>선택 기록 ${rows.length}건 · 완료 ${completed.length}회 · 참여 학생 ${new Set(completed.map((row) => row.studentId)).size}명 · 상담 시간 ${completed.reduce((sum, row) => sum + row.duration, 0)}분</p>
    <h2>상담 분류별 현황</h2><table><thead><tr><th>상담 분류</th><th>완료 상담</th></tr></thead><tbody>${CATEGORIES.map((category) => `<tr><td>${escape(category)}</td><td>${completed.filter((row) => row.category === category).length}회</td></tr>`).join('')}</tbody></table>
    <h2>상담관리대장</h2><table><thead><tr><th>날짜</th><th>학생</th><th>상담 제목</th><th>상태</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escape(row.date)}</td><td>${escape(data.students.find((student) => student.id === row.studentId)?.name ?? '학생 없음')}</td><td>${escape(row.title)}</td><td>${escape(row.state)}</td></tr>`).join('')}</tbody></table>
    <p class="note">Artchology · 선택한 기록 기준. 상담 상세 내용과 보호자 연락처는 이 보고서에 포함되지 않습니다.</p></body></html>`
}
