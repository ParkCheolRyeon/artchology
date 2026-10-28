import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page
} from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

async function launch(initialize = true, existingDirectory?: string): Promise<ElectronApplication> {
  const directory = existingDirectory ?? (await mkdtemp(join(tmpdir(), 'weetory-ui-')))
  const app = await electron.launch({
    args: [resolve('out/main/index.js')],
    env: {
      ...process.env,
      ARTCHOLOGY_TEST_HEADLESS: '1',
      ARTCHOLOGY_DATA_DIR: directory,
      NODE_ENV: 'production'
    }
  })
  if (initialize) await completeSetup(await app.firstWindow())
  return app
}

async function completeSetup(page: Page, pin = '2468'): Promise<string> {
  await page.getByLabel('PIN 설정', { exact: true }).fill(pin)
  await page.getByLabel('PIN 확인', { exact: true }).fill(pin)
  await page.getByRole('button', { name: '다음', exact: true }).click()
  const recovery = await page.getByTestId('setup-recovery-code').innerText()
  await page.getByRole('checkbox', { name: '안전한 곳에 보관했습니다.' }).check()
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.getByRole('button', { name: '건너뛰기 (나중에 설정에서 입력)', exact: true }).click()
  return recovery
}
async function menu(page: Page, name: string): Promise<void> {
  await page
    .getByRole('navigation', { name: '주 메뉴', exact: true })
    .getByRole('button', { name, exact: true })
    .click()
}
async function sub(page: Page, name: string): Promise<void> {
  await page
    .getByRole('navigation', { name: '메뉴별 하위 목록' })
    .getByRole('button', { name, exact: true })
    .click()
}
function dateAfter(value: string, days: number): string {
  const d = new Date(value + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('원본 메뉴와 모든 하위 화면 탐색', async () => {
  const app = await launch()
  try {
    const page = await app.firstWindow()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await expect(
      page.getByRole('navigation', { name: '주 메뉴', exact: true }).getByRole('button')
    ).toHaveCount(7)
    const sidebarWidth = async (): Promise<number> =>
      page
        .locator('.wt-shell')
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).gridTemplateColumns.split(' ')[1])
        )
    await page.getByRole('button', { name: '하위 메뉴 접기' }).click()
    await expect.poll(sidebarWidth).toBe(0)
    await expect(page.locator('#workspace-sidebar')).toHaveAttribute('inert', '')
    await expect(page.getByRole('navigation', { name: '메뉴별 하위 목록' })).toHaveCount(0)
    await page.getByRole('button', { name: '하위 메뉴 펼치기' }).click()
    await expect.poll(sidebarWidth).toBe(214)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(
      await page
        .locator('.wt-shell')
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration))
    ).toBeLessThan(0.001)
    await page.getByRole('button', { name: '하위 메뉴 접기' }).click()
    await expect.poll(sidebarWidth).toBe(0)
    await page.getByRole('button', { name: '하위 메뉴 펼치기' }).click()
    await expect.poll(sidebarWidth).toBe(214)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    for (const name of ['홈', '사례 관리', '학생 관리', '통계', '보고서', '공지사항', '설정']) {
      await menu(page, name)
      const labels = await page
        .getByRole('navigation', { name: '메뉴별 하위 목록' })
        .getByRole('button')
        .allTextContents()
      for (const label of labels) {
        if (['학생 등록', '명렬표 가져오기', '학생 정보 요청'].includes(label)) continue
        await page
          .getByRole('navigation', { name: '메뉴별 하위 목록' })
          .getByRole('button')
          .filter({ hasText: label })
          .click()
        await expect(page.locator('main')).not.toBeEmpty()
        expect(await page.locator('main').innerText()).not.toContain('undefined')
        await expect(page.getByRole('dialog')).toHaveCount(0)
      }
    }
    await menu(page, '홈')
    await sub(page, '캘린더')
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('calendar.png'),
      fullPage: true
    })
    await page.setViewportSize({ width: 980, height: 820 })
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('calendar-980.png')
    })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true)
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('캘린더 종일 여러 날 일정·편집·삭제와 네 가지 보기', async () => {
  const app = await launch()
  try {
    const page = await app.firstWindow()
    await menu(page, '홈')
    await sub(page, '캘린더')
    const today = await page.locator('.wt-fc-today[data-date]').first().getAttribute('data-date')
    expect(today).toBeTruthy()
    await page.getByRole('button', { name: '새 일정', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('일정 제목').fill('3일간 마음 돌봄')
    await dialog.getByLabel('종일 일정').check()
    await dialog.getByLabel('시작 일시').fill(today!)
    await dialog.getByLabel('마지막 날짜 (포함)').fill(dateAfter(today!, 2))
    await dialog.getByRole('button', { name: '일정 추가', exact: true }).click()
    const event = page
      .locator('.wt-fc-event:not(.wt-fc-mirror)')
      .filter({ hasText: '3일간 마음 돌봄' })
      .first()
    await expect(event).toBeVisible()
    await event.click()
    await expect(dialog.getByLabel('시작 일시')).toHaveValue(today!)
    await expect(dialog.getByLabel('마지막 날짜 (포함)')).toHaveValue(dateAfter(today!, 2))
    await dialog.getByLabel('일정 제목').fill('수정한 마음 돌봄')
    await dialog.getByRole('button', { name: '변경 저장' }).click()
    for (const name of ['주', '일', '목록', '월']) {
      await page
        .getByRole('group', { name: '캘린더 보기' })
        .getByRole('button', { name, exact: true })
        .click()
      await expect(
        page.getByRole('group', { name: '캘린더 보기' }).getByRole('button', { name, exact: true })
      ).toHaveAttribute('aria-pressed', 'true')
    }
    await page
      .locator('.wt-fc-event:not(.wt-fc-mirror)')
      .filter({ hasText: '수정한 마음 돌봄' })
      .first()
      .click()
    await dialog.getByRole('button', { name: '삭제', exact: true }).click()
    await dialog.getByRole('button', { name: '일정 삭제 확인' }).click()
    await expect(
      page.locator('.wt-fc-event:not(.wt-fc-mirror)').filter({ hasText: '수정한 마음 돌봄' })
    ).toHaveCount(0)
  } finally {
    await app.close()
  }
})

test('캘린더 실제 마우스 드래그 이동과 기간 조정·되돌리기', async () => {
  const app = await launch()
  try {
    const page = await app.firstWindow()
    await sub(page, '캘린더')
    await page
      .getByRole('group', { name: '캘린더 보기' })
      .getByRole('button', { name: '주', exact: true })
      .click()
    const today = await page.locator('.wt-fc-today[data-date]').first().getAttribute('data-date')
    expect(today).toBeTruthy()
    await page.getByRole('button', { name: '새 일정', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('일정 제목').fill('드래그 검증 일정')
    await dialog.getByLabel('시작 일시').fill(today! + 'T10:00')
    await dialog.getByLabel('종료 일시').fill(today! + 'T11:00')
    await dialog.getByRole('button', { name: '일정 추가', exact: true }).click()
    const event = page
      .locator('.wt-fc-event:not(.wt-fc-mirror)')
      .filter({ hasText: '드래그 검증 일정' })
    await expect(event).toBeVisible()
    const initial = await event.boundingBox()
    if (!initial) throw Error('일정 영역 없음')
    const slots = page.locator('.wt-fc-slot[data-time]')
    const slot1 = await slots.nth(0).boundingBox(),
      slot2 = await slots.nth(1).boundingBox()
    if (!slot1 || !slot2) throw Error('시간 슬롯 없음')
    const hour = (slot2.y - slot1.y) * 2
    await page.mouse.move(initial.x + initial.width / 2, initial.y + 12)
    await page.mouse.down()
    await page.mouse.move(initial.x + initial.width / 2, initial.y + 12 + hour, { steps: 20 })
    await page.mouse.up()
    await expect(page.getByRole('button', { name: '이동 되돌리기' })).toBeVisible()
    await event.click()
    const movedStart = await dialog.getByLabel('시작 일시').inputValue()
    const movedEnd = await dialog.getByLabel('종료 일시').inputValue()
    expect(new Date(movedStart).getTime()).toBeGreaterThan(new Date(today! + 'T10:00').getTime())
    expect(new Date(movedEnd).getTime() - new Date(movedStart).getTime()).toBe(3600000)
    await dialog.getByRole('button', { name: '취소', exact: true }).click()
    await page.getByRole('button', { name: '이동 되돌리기' }).click()
    await event.click()
    await expect(dialog.getByLabel('시작 일시')).toHaveValue(today! + 'T10:00')
    await dialog.getByRole('button', { name: '취소', exact: true }).click()
    const handle = event.locator('.wt-fc-resizer-end')
    await event.hover()
    const hb = await handle.boundingBox()
    if (!hb) throw Error('기간 조정 핸들 없음')
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
    await page.mouse.down()
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + hour, { steps: 20 })
    await page.mouse.up()
    await expect(event).toHaveCount(1)
    await event.click()
    expect(new Date(await dialog.getByLabel('종료 일시').inputValue()).getTime()).toBeGreaterThan(
      new Date(today! + 'T11:00').getTime()
    )
    await expect(dialog.getByLabel('시작 일시')).toHaveValue(today! + 'T10:00')
  } finally {
    await app.close()
  }
})

test('학생 등록에서 사례·상담 기록 작성 및 캘린더 연결', async () => {
  const app = await launch()
  try {
    const page = await app.firstWindow()
    await menu(page, '학생 관리')
    await sub(page, '학생 등록')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('이름 *', { exact: true }).fill('연결검증학생')
    await dialog.getByRole('combobox', { name: '학년', exact: true }).click()
    await page.getByRole('option', { name: '3학년', exact: true }).click()
    await dialog.getByLabel('반 이름').fill('1')
    await dialog.getByLabel('번호', { exact: true }).fill('25')
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    await page.getByRole('button', { name: '연결검증학생', exact: true }).click()
    await expect(page.getByRole('heading', { name: '연결검증학생', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '사례 등록', exact: true }).click()
    await page.getByLabel('주호소 *').fill('학교 적응과 또래 관계')
    await page.getByLabel('상담목표', { exact: true }).fill('친구에게 마음 표현하기')
    await page.getByRole('button', { name: '사례 등록', exact: true }).click()
    await expect(page.getByRole('heading', { name: '연결검증학생', exact: true })).toBeVisible()
    for (const name of ['사례 개념화', '상담 기록', '동의서', '개요']) {
      await page
        .getByRole('tablist', { name: '하위 메뉴', exact: true })
        .getByRole('tab', { name, exact: true })
        .click()
    }
    await page.getByRole('button', { name: '상담 기록 추가', exact: true }).click()
    await page.getByLabel('상담제목', { exact: true }).fill('연결 검증 상담')
    await page.getByLabel('상담내용', { exact: true }).fill('나이스용 요약')
    await page.getByLabel('상담 기록 · 내부 기록', { exact: true }).fill('내부 관찰 내용')
    await page.getByRole('button', { name: '상담 기록 등록', exact: true }).click()
    await expect(page.getByRole('heading', { name: '상담 상세', exact: true })).toBeVisible()
    await expect(page.getByLabel('상담내용', { exact: true })).toHaveValue('나이스용 요약')
    await expect(page.getByLabel('상담 기록 · 내부 기록', { exact: true })).toHaveValue(
      '내부 관찰 내용'
    )
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('session-detail.png')
    })
    await menu(page, '홈')
    await sub(page, '캘린더')
    await expect(
      page.locator('.wt-fc-event:not(.wt-fc-mirror)').filter({ hasText: '연결 검증 상담' }).first()
    ).toBeVisible()
  } finally {
    await app.close()
  }
})

test('공통 UI: 드롭다운·날짜 선택·키보드·모달 안 팝업과 화면 마감', async () => {
  const app = await launch()
  try {
    const page = await app.firstWindow()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await menu(page, '학생 관리')
    const grade = page.getByRole('combobox', { name: '학년', exact: true })
    await grade.click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('students-select.png')
    })
    await page.getByRole('option', { name: '3학년', exact: true }).click()
    await expect(grade).toContainText('3학년')
    await expect(grade).toBeFocused()
    await grade.press('Enter')
    await page.keyboard.press('Escape')
    await expect(grade).toBeFocused()
    await menu(page, '통계')
    await page
      .getByLabel('시작일', { exact: true })
      .locator('..')
      .getByRole('button', { name: '날짜 달력 열기' })
      .click()
    await expect(page.getByRole('dialog', { name: '날짜 선택' })).toBeVisible()
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('statistics-datepicker.png')
    })
    await page.getByRole('combobox', { name: '달력 월' }).click()
    await page.getByRole('option', { name: '3월', exact: true }).click()
    await expect(page.getByRole('combobox', { name: '달력 월' })).toContainText('3월')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: '날짜 선택' })).toHaveCount(0)
    await menu(page, '사례 관리')
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('cases-polished.png')
    })
    await expect(page.locator('main input[type=date]:visible, main select:visible')).toHaveCount(0)
    await menu(page, '공지사항')
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('notices-polished.png')
    })
    const search = await page.getByLabel('공지 검색').boundingBox(),
      card = await page.locator('main [data-slot=card]').first().boundingBox()
    expect(card!.y - (search!.y + search!.height)).toBeGreaterThanOrEqual(20)
    await menu(page, '홈')
    await sub(page, '캘린더')
    await page.getByRole('button', { name: '새 일정', exact: true }).click()
    const modal = page.getByRole('dialog', { name: '새 일정', exact: true })
    await modal
      .getByLabel('시작 일시')
      .locator('..')
      .getByRole('button', { name: '날짜 달력 열기' })
      .click()
    await expect(page.getByRole('dialog', { name: '날짜 선택' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(modal).toBeVisible()
    const originalDate = await modal.getByLabel('시작 일시').inputValue()
    await modal.getByLabel('시작 일시').fill('2026-02-31T09:00')
    expect(
      await modal
        .getByLabel('시작 일시')
        .evaluate((input: HTMLInputElement) => input.checkValidity())
    ).toBe(false)
    await modal.getByLabel('시작 일시').fill(originalDate)
    expect(
      await modal
        .getByLabel('시작 일시')
        .evaluate((input: HTMLInputElement) => input.checkValidity())
    ).toBe(true)
    await modal.getByRole('combobox', { name: '일정 분류' }).click()
    await page.getByRole('option', { name: '교육', exact: true }).click()
    await expect(modal.getByRole('combobox', { name: '일정 분류' })).toContainText('교육')
    await modal.getByRole('button', { name: '취소', exact: true }).click()
    await page.setViewportSize({ width: 980, height: 820 })
    await menu(page, '사례 관리')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true)
    await page.screenshot({ animations: 'disabled', path: test.info().outputPath('cases-980.png') })
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('마음 그리기: 홈 카드·캔버스·되돌리기·저장·작품 보관함', async () => {
  const app = await launch()
  try {
    const page = await app.firstWindow()
    await page.getByRole('button', { name: '드로잉 활동 둘러보기' }).click()
    await expect(page.getByRole('heading', { name: '마음 그리기', exact: true })).toBeVisible()
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('art-activities.png')
    })
    await page.getByRole('button').filter({ hasText: '오늘의 마음 날씨' }).click()
    await page.getByRole('combobox', { name: '참여 학생 *', exact: true }).click()
    await page.getByRole('option').filter({ hasText: '김하늘' }).click()
    const canvas = page.getByLabel('마음 그리기 캔버스')
    await expect(page.getByRole('listbox')).toHaveCount(0)
    await canvas.scrollIntoViewIfNeeded()
    const box = await canvas.boundingBox()
    const draw = async (): Promise<void> => {
      await page.mouse.move(box!.x + box!.width * 0.2, box!.y + box!.height * 0.4)
      await page.mouse.down()
      await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height * 0.4, { steps: 12 })
      await page.mouse.up()
    }
    const hasPaint = async (): Promise<boolean> =>
      canvas.evaluate((element: HTMLCanvasElement) => {
        const pixels = element
          .getContext('2d')!
          .getImageData(0, 0, element.width, element.height).data
        return pixels.some((value, index) => index % 4 !== 3 && value < 240)
      })
    await draw()
    expect(await hasPaint()).toBe(true)
    await page.getByRole('button', { name: '되돌리기', exact: true }).click()
    expect(await hasPaint()).toBe(false)
    await draw()
    await page.getByRole('button', { name: '그림 지우기', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: '계속 그리기' }).click()
    expect(await hasPaint()).toBe(true)
    await page.getByLabel('학생의 설명과 관찰 메모').fill('오늘은 맑은 하늘 같은 마음이에요.')
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('art-canvas.png')
    })
    await page.getByRole('button', { name: '활동 저장', exact: true }).click()
    await expect(page.getByText('함께 그린 마음 그림 1점')).toBeVisible()
    await menu(page, '홈')
    await sub(page, '마음 그리기')
    await page.getByRole('tab', { name: '작품 보관함' }).click()
    await page.getByRole('button').filter({ hasText: '오늘의 마음 날씨' }).click()
    await expect(
      page.getByRole('dialog').getByText('오늘은 맑은 하늘 같은 마음이에요.')
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 980, height: 820 })
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('art-gallery-980.png')
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  } finally {
    await app.close()
  }
})

test('탭 선택 표시: 이동·너비 변경·키보드·상단 탭 전환', async () => {
  const app = await launch()
  try {
    const page = await app.firstWindow()
    await menu(page, '통계')
    const list = page.getByRole('tablist', { name: '하위 메뉴', exact: true })
    const aligned = async (): Promise<boolean> =>
      list.evaluate((element) => {
        const indicator = element.querySelector('.wt-tab-indicator')!.getBoundingClientRect()
        const tab = element.querySelector('[data-state=active]')!.getBoundingClientRect()
        return Math.abs(indicator.x - tab.x) < 1 && Math.abs(indicator.width - tab.width) < 1
      })
    await expect.poll(aligned).toBe(true)
    await list.getByRole('tab', { name: '상담 분류' }).click()
    await expect.poll(aligned).toBe(true)
    await list.getByRole('tab', { name: '상담 분류' }).press('ArrowRight')
    await expect(list.getByRole('tab', { name: '시간 흐름' })).toHaveAttribute(
      'data-state',
      'active'
    )
    await expect.poll(aligned).toBe(true)
    await page.setViewportSize({ width: 980, height: 820 })
    await expect.poll(aligned).toBe(true)
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('tab-indicator.png')
    })
    await page.getByRole('button', { name: '새 탭', exact: true }).click()
    const top = page.getByRole('tablist', { name: '열린 화면' })
    await top.getByRole('tab', { name: '통계' }).click()
    await expect
      .poll(() =>
        top.evaluate((element) => {
          const indicator = element.querySelector('.wt-tab-indicator')!.getBoundingClientRect()
          const active = element.querySelector('.wt-tab.active')!.getBoundingClientRect()
          return (
            Math.abs(indicator.x - active.x) < 1 && Math.abs(indicator.width - active.width) < 1
          )
        })
      )
      .toBe(true)
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('workspace-tabs.png')
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(
      await list
        .locator('.wt-tab-indicator')
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration))
    ).toBeLessThan(0.001)
  } finally {
    await app.close()
  }
})

async function loginDemo(page: Page): Promise<void> {
  await menu(page, '설정')
  await sub(page, '구독 · 계정')
  await page.locator('main').getByRole('button', { name: '로그인', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await page.screenshot({ path: 'test-results/login-demo.png', animations: 'disabled' })
  await dialog.getByLabel('이메일', { exact: true }).fill('teacher@example.com')
  await dialog.getByRole('button', { name: '인증 코드 받기' }).click()
  await dialog.getByLabel('인증 코드', { exact: true }).fill('123456')
  await dialog.getByRole('button', { name: '확인', exact: true }).click()
  await page.getByRole('button', { name: '구독 코드 등록', exact: true }).click()
  await dialog.getByLabel('구독 코드', { exact: true }).fill('WEEDAM-DEMO-DEMO-DEMO')
  await dialog.getByRole('button', { name: '등록', exact: true }).click()
}

test('계정·구독·PIN 상태는 화면 이동 후 유지되고 새로고침하면 초기화', async () => {
  const app = await launch()
  try {
    const page = await app.firstWindow()
    await loginDemo(page)
    await menu(page, '홈')
    await menu(page, '설정')
    await sub(page, '구독 · 계정')
    await expect(page.locator('main')).toContainText('플러스 플랜')
    await page.screenshot({ path: 'test-results/account-demo.png', animations: 'disabled' })
    await page.getByRole('button', { name: '화면 잠금', exact: true }).click()
    await page.getByLabel('PIN', { exact: true }).fill('0000')
    await page.getByRole('button', { name: '잠금 해제', exact: true }).click()
    await expect(page.getByTestId('toast').last()).toContainText('PIN이 일치하지 않습니다.')
    await page.getByLabel('PIN', { exact: true }).fill('2468')
    await page.getByRole('button', { name: '잠금 해제', exact: true }).click()
    await expect(page.locator('.wt-lock')).toHaveCount(0)
    await page.getByRole('button', { name: '로그아웃', exact: true }).click()
    await page.locator('main').getByRole('button', { name: '로그인', exact: true }).click()
    await page.getByRole('button', { name: '구글 계정으로 로그인' }).click()
    await page.getByRole('button', { name: 'teacher@example.com으로 계속' }).click()
    await expect(page.locator('main')).toContainText('플러스 플랜')
    await page.reload()
    await menu(page, '설정')
    await sub(page, '구독 · 계정')
    await expect(
      page.locator('main').getByRole('button', { name: '로그인', exact: true })
    ).toBeVisible()
  } finally {
    await app.close()
  }
})

test('위토리 동의서: SMS·링크 발송과 학부모 응답 및 재발송', async () => {
  const app = await launch()
  try {
    const page = await app.firstWindow()
    await loginDemo(page)
    await menu(page, '학생 관리')
    await page.getByRole('button', { name: '김하늘', exact: true }).click()
    await page.getByRole('button', { name: '정보 수정', exact: true }).click()
    await page.getByRole('dialog').getByLabel('보호자 이름').fill('김보호자')
    await page.getByRole('dialog').getByLabel('보호자 연락처').fill('010-1234-5678')
    await page.getByRole('dialog').getByRole('button', { name: '저장', exact: true }).click()
    await menu(page, '사례 관리')
    await page
      .locator('button.wt-card')
      .filter({ has: page.getByRole('heading', { name: '김하늘', exact: true }) })
      .click()
    await page.getByRole('tab', { name: '동의서', exact: true }).click()
    await page.getByRole('button', { name: '동의서 발송', exact: true }).click()
    await expect(page.getByRole('combobox', { name: '전달 방법' })).toContainText('SMS 자동 발송')
    await expect(page.getByRole('dialog')).toContainText('010-1234-5678')
    await page.screenshot({ path: 'test-results/consent-send.png', animations: 'disabled' })
    await page.getByRole('button', { name: '문자 발송', exact: true }).click()
    await page.getByRole('button', { name: '학부모 화면 체험' }).click()
    await page.getByLabel('보호자 성명').fill('김보호자')
    await page.getByRole('combobox', { name: '상담 참여', exact: true }).click()
    await page.getByRole('option', { name: '동의', exact: true }).click()
    await page.getByRole('combobox', { name: '개인정보 수집·이용', exact: true }).click()
    await page.getByRole('option', { name: '미동의', exact: true }).click()
    await page.screenshot({ path: 'test-results/consent-parent.png', animations: 'disabled' })
    await page.getByRole('button', { name: '응답 제출 체험' }).click()
    await expect(page.getByRole('heading', { name: '동의서 응답', exact: true })).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText('미동의 · 응답 수신 완료')
    await page.getByRole('button', { name: '닫기', exact: true }).click()
    await menu(page, '홈')
    await menu(page, '사례 관리')
    await page
      .locator('button.wt-card')
      .filter({ has: page.getByRole('heading', { name: '김하늘', exact: true }) })
      .click()
    await page.getByRole('tab', { name: '동의서', exact: true }).click()
    await expect(page.locator('main')).toContainText('응답 완료 · 미동의')
    await page.getByRole('button', { name: '동의서 발송', exact: true }).click()
    await page.getByRole('combobox', { name: '전달 방법' }).click()
    await page.getByRole('option', { name: '링크 직접 전달(복사)', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText('기존 응답은 보관됩니다')
    await page.getByRole('button', { name: '링크 생성', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText('https://consent.example.invalid/demo/')
    await page.getByRole('button', { name: '닫기', exact: true }).click()
    await expect(page.getByRole('button', { name: '응답 보기', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '동의서 발송', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText('이전 링크는 만료됩니다')
    await page.getByRole('button', { name: '문자 발송', exact: true }).click()
    await expect(page.locator('main')).toContainText('만료')
    await page.getByRole('button', { name: '처리 기록', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText('학부모 응답 수신 시연')
    await expect(page.getByRole('dialog')).toContainText('재발송으로 이전 링크 만료')
  } finally {
    await app.close()
  }
})

test('학교별 시간표 저장과 급식 예시 화면', async () => {
  const app = await launch()
  try {
    const page = await app.firstWindow()
    await menu(page, '설정')
    await sub(page, '시간표(교시)')
    await page.getByLabel('1행 교시').fill('아침 모임')
    await page.getByRole('button', { name: '시간표 저장' }).click()
    await menu(page, '홈')
    await sub(page, '학교 생활')
    await expect(page.locator('main')).toContainText('아침 모임')
    await expect(page.locator('main')).toContainText('예시 식단')
    await page.locator('main').evaluate((element) => {
      element.scrollTop = 0
    })
    await page.screenshot({ path: 'test-results/school-life.png', animations: 'disabled' })
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(980, 800))
    await page.screenshot({ path: 'test-results/school-life-980.png', animations: 'disabled' })
    expect(
      await page
        .locator('main')
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1)
    ).toBeTruthy()
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 940))
    await menu(page, '설정')
    await sub(page, '학교 관리')
    await page.getByRole('button', { name: '학교 추가', exact: true }).click()
    await page.getByRole('dialog').getByLabel('학교명').fill('두번째 학교')
    await page.getByRole('dialog').getByRole('button', { name: '저장', exact: true }).click()
    const row = page.locator('.wt-school-row').filter({ hasText: '두번째 학교' })
    await row.getByRole('button', { name: '전환', exact: true }).click()
    await sub(page, '시간표(교시)')
    await expect(page.getByText('아직 등록된 시간표가 없습니다')).toBeVisible()
    await page.getByRole('button', { name: '기본 시간표 만들기' }).click()
    await expect(page.getByLabel('1행 교시')).toHaveValue('1교시')
    await page.getByLabel('1행 시작').fill('930')
    await page.getByLabel('1행 시작').press('Enter')
    await expect(page.getByLabel('2행 시작')).toHaveValue('10:20')
    await page.getByRole('button', { name: '시간표 저장' }).click()
    await menu(page, '홈')
    await sub(page, '캘린더')
    await page.getByRole('button', { name: '새 일정', exact: true }).click()
    await page.getByRole('button', { name: '1교시', exact: true }).click()
    await expect(page.getByLabel('시작 일시')).toHaveValue(/T09:30$/)
  } finally {
    await app.close()
  }
})

test('동의서 양식의 다중 선택·날짜·전자서명 작성과 응답 보관', async () => {
  const app = await launch()
  try {
    const page = await app.firstWindow()
    await loginDemo(page)
    await menu(page, '사례 관리')
    await page
      .locator('button.wt-card')
      .filter({ has: page.getByRole('heading', { name: '김하늘', exact: true }) })
      .click()
    await page.getByRole('tab', { name: '동의서', exact: true }).click()
    await page.getByRole('button', { name: '양식 관리', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('템플릿 이름', { exact: true }).fill('상담 신청 확인')
    for (const [index, label, kind] of [
      [1, '관심 분야', '선택'],
      [2, '작성일', '날짜'],
      [3, '보호자 서명', '전자서명']
    ] as const) {
      await dialog.getByLabel(`${index}번 질문`, { exact: true }).fill(label)
      await dialog.getByRole('combobox', { name: `${index}번 응답 유형`, exact: true }).click()
      await page.getByRole('option', { name: kind, exact: true }).click()
    }
    await dialog.getByLabel('1번 선택지', { exact: true }).fill('친구 관계, 학업, 진로')
    await dialog.getByRole('checkbox', { name: '여러 개 선택', exact: true }).check()
    await dialog.getByRole('button', { name: '새 양식 저장', exact: true }).click()
    await dialog.getByRole('button', { name: '닫기', exact: true }).click()
    await page.getByRole('button', { name: '동의서 발송', exact: true }).click()
    await dialog.getByRole('checkbox', { name: '상담 동의서 (기본)', exact: true }).uncheck()
    await dialog.getByRole('checkbox', { name: '상담 신청 확인', exact: true }).check()
    await dialog.getByRole('button', { name: '링크 생성', exact: true }).click()
    await dialog.getByRole('button', { name: '학부모 화면 체험', exact: true }).click()
    await dialog.getByRole('checkbox', { name: '친구 관계', exact: true }).check()
    await dialog.getByRole('checkbox', { name: '진로', exact: true }).check()
    await dialog.getByLabel('작성일', { exact: true }).fill('2026-10-28')
    await dialog.getByLabel('작성일', { exact: true }).press('Tab')
    const canvas = dialog.getByLabel('보호자 서명 그리기', { exact: true })
    await canvas.scrollIntoViewIfNeeded()
    const box = (await canvas.boundingBox())!
    await page.mouse.move(box.x + 35, box.y + 45)
    await page.mouse.down()
    await page.mouse.move(box.x + 95, box.y + 90, { steps: 8 })
    await page.mouse.move(box.x + 170, box.y + 40, { steps: 8 })
    await page.mouse.up()
    await page.screenshot({ path: 'test-results/consent-signature.png', animations: 'disabled' })
    await dialog.getByRole('button', { name: '응답 제출 체험', exact: true }).click()
    await expect(dialog).toContainText('친구 관계, 진로')
    await expect(dialog).toContainText('2026-10-28')
    await expect(dialog.getByRole('img', { name: '보호자 서명 서명', exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: '닫기', exact: true }).click()
    await page.getByRole('button', { name: '응답 보기', exact: true }).click()
    await expect(
      dialog.getByRole('img', { name: '보호자 서명 서명', exact: true })
    ).toHaveAttribute('src', /^data:image\/png/)
  } finally {
    await app.close()
  }
})

test('첫 진입 PIN 설정·복구 코드·기본 정보와 한 시간 만료', async () => {
  const app = await launch(false)
  try {
    const page = await app.firstWindow()
    await page.clock.install()
    await expect(page.getByRole('navigation', { name: '주 메뉴', exact: true })).toHaveCount(0)
    await page.screenshot({ path: 'test-results/first-run-pin.png', animations: 'disabled' })
    await page.getByLabel('PIN 설정', { exact: true }).fill('2468')
    await page.getByLabel('PIN 확인', { exact: true }).fill('0000')
    await page.getByRole('button', { name: '다음', exact: true }).click()
    await expect(page.getByTestId('toast').last()).toContainText('동일하게')
    await page.getByLabel('PIN 확인', { exact: true }).fill('2468')
    await page.getByRole('button', { name: '다음', exact: true }).click()
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled()
    await page.getByRole('checkbox', { name: '안전한 곳에 보관했습니다.' }).check()
    await page.getByRole('button', { name: '다음', exact: true }).click()
    await page.getByLabel('학교', { exact: true }).fill('새봄 초등학교')
    await page.getByLabel('상담사 이름', { exact: true }).fill('이상담')
    await page.screenshot({ path: 'test-results/first-run-profile.png', animations: 'disabled' })
    await page.getByRole('button', { name: '상담실 시작하기' }).click()
    await expect(page.locator('.wt-school-brand')).toContainText('이상담')
    await page.clock.fastForward(59 * 60 * 1000)
    await menu(page, '학생 관리')
    await sub(page, '학생 등록')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.clock.fastForward(60 * 1000)
    await expect(page.getByRole('main', { name: 'PIN 잠금 화면' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: '주 메뉴', exact: true })).toHaveCount(0)
    await expect(
      page.getByText('인증 후 1시간이 지나 잠겼습니다. PIN을 다시 입력해 주세요.')
    ).toBeVisible()
    await page.getByLabel('PIN', { exact: true }).fill('0000')
    await page.getByRole('button', { name: '잠금 해제', exact: true }).click()
    await expect(page.getByTestId('toast').last()).toContainText('PIN이 일치하지')
    await page.screenshot({ path: 'test-results/pin-expired.png', animations: 'disabled' })
    await page.getByLabel('PIN', { exact: true }).fill('2468')
    await page.getByRole('button', { name: '잠금 해제', exact: true }).click()
    await expect(page.getByRole('dialog', { name: '학생 등록' })).toBeVisible()
    await page.getByRole('button', { name: '닫기', exact: true }).click()
    await expect(page.getByRole('navigation', { name: '주 메뉴', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('navigation', { name: '주 메뉴', exact: true })).toBeVisible()
  } finally {
    await app.close()
  }
})

test('재실행 시 PIN 진입·초기 흐름 체험 분리·복구 코드로 PIN 재설정', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'artchology-auth-'))
  let app = await launch(false, directory)
  try {
    let page = await app.firstWindow()
    const recovery = await completeSetup(page)
    await app.close()
    app = await launch(false, directory)
    page = await app.firstWindow()
    await expect(page.getByRole('main', { name: 'PIN 잠금 화면' })).toBeVisible()
    await page.getByRole('button', { name: '초기 flow 경험하기' }).click()
    await expect(
      page.getByText('초기 흐름 체험 중 · 기존 PIN과 상담 자료는 변경되지 않습니다.')
    ).toBeVisible()
    await page.getByRole('button', { name: '기존 PIN 화면으로 돌아가기' }).click()
    await page.getByRole('button', { name: '초기 flow 경험하기' }).click()
    await completeSetup(page, '1357')
    await expect(page.getByRole('main', { name: 'PIN 잠금 화면' })).toBeVisible()
    await page.getByLabel('PIN', { exact: true }).fill('1357')
    await page.getByRole('button', { name: '잠금 해제', exact: true }).click()
    await expect(page.getByTestId('toast').last()).toContainText('PIN이 일치하지')
    await page.getByLabel('PIN', { exact: true }).fill('2468')
    await page.getByRole('button', { name: '잠금 해제', exact: true }).click()
    await page.getByRole('button', { name: '화면 잠금', exact: true }).click()
    await page.getByRole('button', { name: 'PIN을 잊으셨나요?' }).click()
    await page.getByLabel('복구 코드', { exact: true }).fill(recovery)
    await page.getByLabel('새 PIN', { exact: true }).fill('8642')
    await page.getByLabel('새 PIN 확인', { exact: true }).fill('8642')
    await page.getByRole('button', { name: 'PIN 재설정 후 시작' }).click()
    await page.getByRole('button', { name: '화면 잠금', exact: true }).click()
    await page.getByLabel('PIN', { exact: true }).fill('2468')
    await page.getByRole('button', { name: '잠금 해제', exact: true }).click()
    await expect(page.getByTestId('toast').last()).toBeVisible()
    await page.getByLabel('PIN', { exact: true }).fill('8642')
    await page.getByRole('button', { name: '잠금 해제', exact: true }).click()
    await expect(page.getByRole('navigation', { name: '주 메뉴', exact: true })).toBeVisible()
    await menu(page, '설정')
    await sub(page, '보안 설정')
    await page.getByLabel('현재 PIN', { exact: true }).fill('8642')
    await page.getByLabel('새 PIN', { exact: true }).fill('9753')
    await page.getByLabel('새 PIN 확인', { exact: true }).fill('9753')
    await page.getByRole('button', { name: 'PIN 변경', exact: true }).click()
    await expect(
      page.getByTestId('toast').filter({ hasText: 'PIN을 변경했습니다.' })
    ).toContainText('PIN을 변경했습니다.')
    await page.locator('header').getByRole('button', { name: '화면 잠금', exact: true }).click()
    await page.getByLabel('PIN', { exact: true }).fill('9753')
    await page.getByRole('button', { name: '잠금 해제', exact: true }).click()
    await expect(page.getByRole('navigation', { name: '주 메뉴', exact: true })).toBeVisible()
  } finally {
    await app.close()
  }
})

test('루트 토스트는 PIN 폼을 움직이지 않고 중복 경고·닫기·자동 종료를 처리', async () => {
  const app = await launch(false)
  try {
    const page = await app.firstWindow()
    await page.clock.install()
    const section = page.locator('main[aria-label="처음 사용 설정"] section')
    const next = page.getByRole('button', { name: '다음', exact: true })
    await page.getByLabel('PIN 설정', { exact: true }).fill('2468')
    await page.getByLabel('PIN 확인', { exact: true }).fill('0000')
    const before = await section.boundingBox()
    const buttonBefore = await next.boundingBox()
    await next.click()
    const toast = page.getByTestId('toast')
    await expect(toast).toHaveAttribute('data-tone', 'warn')
    await expect(toast).toContainText('동일하게')
    expect(await section.boundingBox()).toEqual(before)
    expect(await next.boundingBox()).toEqual(buttonBefore)
    await next.click()
    await expect(toast).toHaveCount(1)
    await page.screenshot({ path: 'test-results/pin-warning-toast.png', animations: 'disabled' })
    await toast.getByRole('button', { name: '알림 닫기' }).click()
    await expect(toast).toHaveCount(0)
    await next.click()
    await page.clock.fastForward(7000)
    await expect(toast).toHaveCount(0)
    await page.getByLabel('PIN 확인', { exact: true }).fill('2468')
    await next.click()
    await expect(page.getByRole('heading', { name: '복구 코드 생성' })).toBeVisible()
  } finally {
    await app.close()
  }
})
