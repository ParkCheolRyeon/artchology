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

async function launch(): Promise<ElectronApplication> {
  const directory = await mkdtemp(join(tmpdir(), 'weetory-ui-'))
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
