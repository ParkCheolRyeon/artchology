import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

async function launch(directory: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [resolve('out/main/index.js')],
    env: {
      ...process.env,
      ARTCHOLOGY_TEST_HEADLESS: '1',
      ARTCHOLOGY_DATA_DIR: directory,
      NODE_ENV: 'production'
    }
  })
}

test('학생 등록 → 상담 저장 → 그림 저장 → 재시작 후 보존', async () => {
  const testInfo = test.info()
  const directory = await mkdtemp(join(tmpdir(), 'artchology-e2e-'))
  let app = await launch(directory)
  try {
    let page = await app.firstWindow()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await expect(page.getByRole('heading', { name: '마음을 살피는 하루의 시작' })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('home.png') })
    await page
      .getByRole('navigation', { name: '주 메뉴' })
      .getByRole('button', { name: '학생 관리' })
      .click()
    await page.getByRole('button', { name: '학생 등록', exact: true }).click()
    const studentDialog = page.getByRole('dialog')
    await studentDialog.getByLabel('학생 이름').fill('테스트학생')
    await studentDialog.getByLabel('상담 배경 및 메모').fill('재시작 후 보존을 확인하는 가상 기록')
    await studentDialog.getByRole('button', { name: '학생 등록', exact: true }).click()
    await expect(studentDialog).toHaveCount(0)
    await page.getByRole('textbox', { name: '학생 이름 검색', exact: true }).fill('테스트학생')
    await page.getByRole('button', { name: '테스트학생', exact: true }).click()
    await expect(page.getByRole('heading', { name: '테스트학생', exact: true })).toBeVisible()
    await page
      .locator('.profile-heading')
      .getByRole('button', { name: '상담 기록', exact: true })
      .click()
    const sessionDialog = page.getByRole('dialog')
    await sessionDialog.getByLabel('상담 제목').fill('나의 첫 상담')
    await sessionDialog
      .getByLabel('상담 내용')
      .fill('오늘은 친구와 나눈 이야기를 그림으로 표현했습니다.')
    await sessionDialog.getByRole('button', { name: '상담 저장' }).click()
    await expect(sessionDialog).toHaveCount(0)
    await expect(page.getByRole('button', { name: '나의 첫 상담' })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('student-detail.png') })
    await page.getByRole('button', { name: '그림으로 이야기하기' }).click()
    await page.getByRole('button', { name: /오늘의 마음 날씨/ }).click()
    const canvas = page.getByLabel('마음 그리기 캔버스')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Drawing canvas was not rendered')
    await page.mouse.move(box.x + 80, box.y + 80)
    await page.mouse.down()
    await page.mouse.move(box.x + 150, box.y + 130, { steps: 8 })
    await page.mouse.up()
    await page.getByLabel('학생의 설명과 관찰 메모').fill('맑은 하늘 같은 기분이라고 이야기했어요.')
    await page.screenshot({ path: testInfo.outputPath('drawing.png') })
    await page.getByRole('button', { name: '활동 저장' }).click()
    await expect(page.getByRole('heading', { name: '테스트학생', exact: true })).toBeVisible()
    await page.getByRole('button', { name: /마음 그림/ }).click()
    await expect(page.getByAltText('테스트학생의 오늘의 마음 날씨')).toBeVisible()
    // Invalid IPC values must not create records.
    const invalid = await page.evaluate(() =>
      window.api.saveStudent({
        name: '',
        grade: 0,
        classroom: 1,
        number: 1,
        category: '또래 관계',
        status: '진행 중',
        concern: '',
        guardian: '',
        phone: ''
      })
    )
    expect(invalid.ok).toBe(false)
    for (const name of ['통계', '보고서']) {
      await page
        .getByRole('navigation', { name: '주 메뉴' })
        .getByRole('button', { name, exact: true })
        .click()
      await expect(page.locator('h1')).toBeVisible()
    }
    await page.getByRole('button', { name: '설정', exact: true }).click()
    await page.getByLabel('학교 이름').fill('테스트 초등학교')
    await page.getByRole('button', { name: '변경 저장' }).click()
    await expect(page.locator('.school-block')).toContainText('테스트 초등학교')
    const exportPath = join(directory, 'export.csv')
    await app.evaluate(({ dialog }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path })
    }, exportPath)
    await page
      .getByRole('navigation', { name: '주 메뉴' })
      .getByRole('button', { name: '보고서', exact: true })
      .click()
    await page.getByRole('button', { name: 'CSV 내보내기' }).click()
    await expect(page.getByRole('status')).toContainText('파일을 저장했습니다.')
    expect(await readFile(exportPath, 'utf8')).toContain('나의 첫 상담')
    await page
      .getByRole('navigation', { name: '주 메뉴' })
      .getByRole('button', { name: '홈', exact: true })
      .click()
    await page.getByRole('button', { name: '일정 추가' }).click()
    await expect(page.getByRole('dialog').getByLabel('상담 상태')).toHaveValue('예정')
    await page.getByRole('dialog').getByRole('button', { name: '취소', exact: true }).click()
    expect(errors).toEqual([])
    await app.close()
    app = await launch(directory)
    page = await app.firstWindow()
    await expect(page.getByRole('heading', { name: '마음을 살피는 하루의 시작' })).toBeVisible()
    const stored = await page.evaluate(() => window.api.load())
    expect(stored.ok).toBe(true)
    if (!stored.ok) throw new Error(stored.error)
    expect(stored.data.students.filter((student) => student.name === '테스트학생')).toHaveLength(1)
    expect(stored.data.sessions.some((session) => session.title === '나의 첫 상담')).toBe(true)
    expect(stored.data.drawings).toHaveLength(1)
    expect(stored.data.settings.school).toBe('테스트 초등학교')
  } finally {
    await app.close()
  }
})

test('손상된 DB를 예시 데이터로 덮어쓰지 않는다', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'artchology-corrupt-'))
  const path = join(directory, 'artchology-demo.json')
  await writeFile(path, '{broken')
  const app = await launch(directory)
  try {
    const page = await app.firstWindow()
    await expect(page.getByRole('heading', { name: '데이터를 불러오지 못했어요' })).toBeVisible()
    expect(await readFile(path, 'utf8')).toBe('{broken')
  } finally {
    await app.close()
  }
})

test('메뉴 상세 이동, 필터 보존, 상담 수정과 다음 예약', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'artchology-depths-'))
  const app = await launch(directory)
  try {
    const page = await app.firstWindow()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await expect(page.locator('h1')).toContainText('마음을 살피는 하루의 시작')
    const menu = page.getByRole('navigation', { name: '주 메뉴' })
    await menu.getByRole('button', { name: '학생 관리', exact: true }).click()
    await page.getByRole('textbox', { name: '학생 이름 검색', exact: true }).fill('김하늘')
    await page.getByRole('button', { name: '김하늘', exact: true }).click()
    await page
      .getByRole('navigation', { name: '학생 상세 메뉴' })
      .getByRole('button', { name: '기본 정보', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: '학생 기본 정보' })).toBeVisible()
    await page.getByRole('button', { name: '학생 목록', exact: true }).click()
    await expect(page.getByRole('textbox', { name: '학생 이름 검색', exact: true })).toHaveValue(
      '김하늘'
    )
    await menu.getByRole('button', { name: '상담 기록', exact: true }).click()
    await page.getByRole('textbox', { name: '학생 이름 또는 상담 제목 검색' }).fill('김하늘')
    await page.locator('.session-list-row').first().click()
    await expect(page.getByRole('button', { name: '기록 수정' })).toBeVisible()
    await page.getByRole('button', { name: '기록 수정' }).click()
    await page.getByRole('dialog').getByLabel('상담 제목').fill('깊이 화면에서 수정한 상담')
    await page.getByRole('dialog').getByRole('button', { name: '상담 저장' }).click()
    await expect(page.getByRole('heading', { name: '깊이 화면에서 수정한 상담' })).toBeVisible()
    await page.getByRole('button', { name: '다음 상담 예약' }).click()
    await expect(
      page.getByRole('dialog').getByRole('combobox', { name: '학생 *', exact: true })
    ).toHaveValue('demo-student-1')
    await expect(page.getByRole('dialog').getByLabel('상담 상태')).toHaveValue('예정')
    await page.getByRole('dialog').getByRole('button', { name: '취소', exact: true }).click()
    await page
      .getByRole('navigation', { name: '상담 상세 메뉴' })
      .getByRole('button', { name: '학생 상담 이력' })
      .click()
    await expect(page.locator('main').getByRole('table')).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('record-detail.png') })
    await page.getByRole('button', { name: '이전 화면으로' }).click()
    await expect(page.getByRole('textbox', { name: '학생 이름 또는 상담 제목 검색' })).toHaveValue(
      '김하늘'
    )
    await page
      .getByRole('navigation', { name: '상담 기록 보기' })
      .getByRole('button', { name: '달력', exact: true })
      .click()
    await expect(page.locator('.calendar')).toBeVisible()
    await menu.getByRole('button', { name: '통계', exact: true }).click()
    await page
      .getByRole('navigation', { name: '통계 하위 메뉴' })
      .getByRole('button', { name: '상담 분류' })
      .click()
    await page.locator('.bar-button').first().click()
    await expect(page.getByRole('button', { name: '통계로 돌아가기' })).toBeVisible()
    await page.locator('tbody .text-link').first().click()
    await expect(page.getByRole('button', { name: '기록 수정' })).toBeVisible()
    await page.getByRole('button', { name: '이전 화면으로' }).click()
    await expect(page.getByRole('button', { name: '통계로 돌아가기' })).toBeVisible()
    await page.getByRole('button', { name: '통계로 돌아가기' }).click()
    for (const name of ['시간 흐름', '학생 현황', '요약']) {
      await page
        .getByRole('navigation', { name: '통계 하위 메뉴' })
        .getByRole('button', { name, exact: true })
        .click()
      await expect(page.locator('h1')).toHaveText('상담 통계')
    }
    await menu.getByRole('button', { name: '마음 그리기', exact: true }).click()
    await page.getByRole('button', { name: '작품 보관함', exact: true }).click()
    await expect(page.getByRole('heading', { name: '아직 마음 그림이 없어요' })).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('보고서 필터와 CSV/PDF, 백업 복원 및 잘못된 백업 보호', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'artchology-reports-'))
  const app = await launch(directory)
  try {
    const page = await app.firstWindow()
    await expect(page.locator('h1')).toContainText('마음을 살피는 하루의 시작')
    const original = await page.evaluate(() => window.api.load())
    if (!original.ok) throw new Error(original.error)
    const menu = page.getByRole('navigation', { name: '주 메뉴' })
    await menu.getByRole('button', { name: '보고서', exact: true }).click()
    await page.getByLabel('보고서 학생').selectOption('demo-student-1')
    await page.getByLabel('보고서 상담 상태').selectOption('완료')
    const csv = join(directory, 'filtered.csv')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, csv)
    await page.getByRole('button', { name: 'CSV 내보내기' }).click()
    await expect(page.getByRole('status')).toContainText('파일을 저장했습니다.')
    const content = await readFile(csv, 'utf8')
    expect(content).toContain('김하늘')
    expect(content).not.toContain('이서준')
    expect(content).not.toContain('"예정"')
    expect(content.split('\r\n')).toHaveLength(
      1 +
        original.data.sessions.filter(
          (row) => row.studentId === 'demo-student-1' && row.state === '완료'
        ).length
    )
    await page.getByLabel('시작일', { exact: true }).fill('2026-12-31')
    await page.getByLabel('종료일', { exact: true }).fill('2026-01-01')
    await expect(page.getByRole('alert')).toContainText('시작일은 종료일보다')
    await expect(page.getByRole('button', { name: 'CSV 내보내기' })).toBeDisabled()
    await page.getByRole('button', { name: '초기화', exact: true }).click()
    await page.getByRole('button', { name: '관리자 보고서', exact: true }).click()
    const pdf = join(directory, 'report.pdf')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, pdf)
    await page.getByRole('button', { name: 'PDF 저장' }).click()
    await expect
      .poll(async () => {
        try {
          return (await readFile(pdf)).subarray(0, 5).toString()
        } catch {
          return ''
        }
      })
      .toBe('%PDF-')
    await page.screenshot({ path: test.info().outputPath('report-preview.png') })
    await page.getByRole('button', { name: '설정', exact: true }).click()
    await page.getByRole('button', { name: '백업 · 복원', exact: true }).click()
    const backup = join(directory, 'backup.json')
    const restored = {
      ...original.data,
      settings: { ...original.data.settings, school: '복원 확인 학교' }
    }
    await writeFile(backup, JSON.stringify(restored))
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
    }, backup)
    await page.getByRole('button', { name: '복원할 백업 선택' }).click()
    const dialog = page.getByRole('dialog', { name: '백업 복원 확인' })
    await expect(dialog).toContainText('복원 확인 학교')
    await expect(dialog.getByRole('button', { name: '확인한 백업 복원' })).toBeDisabled()
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: '확인한 백업 복원' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.locator('.school-block')).toContainText('복원 확인 학교')
    const after = await page.evaluate(() => window.api.load())
    expect(after.ok && after.data.settings.school).toBe('복원 확인 학교')
    const invalid = {
      ...restored,
      sessions: [{ ...restored.sessions[0], studentId: 'missing-student' }]
    }
    await writeFile(backup, JSON.stringify(invalid))
    await page.getByRole('button', { name: '복원할 백업 선택' }).click()
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: '확인한 백업 복원' }).click()
    await expect(dialog.getByRole('alert')).toContainText('학생 연결')
    const unchanged = await page.evaluate(() => window.api.load())
    expect(unchanged).toEqual(after)
    await dialog.getByRole('button', { name: '취소' }).click()
    await writeFile(backup, '{broken')
    await page.getByRole('button', { name: '복원할 백업 선택' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    expect(await page.evaluate(() => window.api.load())).toEqual(after)
  } finally {
    await app.close()
  }
})
