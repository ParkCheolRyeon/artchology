export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '처리하지 못했습니다. 다시 시도해 주세요.'
}
export function dateLabel(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}
