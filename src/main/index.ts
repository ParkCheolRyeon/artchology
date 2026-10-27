import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'node:path'
import { writeFile, readFile, stat } from 'node:fs/promises'
import { ZodError } from 'zod'
import { is, optimizer } from '@electron-toolkit/utils'
import {
  APP,
  IPC,
  localDate,
  filterSessions,
  reportFilterSchema,
  storeSchema,
  type Store,
  type Result
} from '../shared/model'
import { createStore } from './data/store'
import { sessionCsv, reportHtml } from './data/reports'

if (process.env.ARTCHOLOGY_DATA_DIR) app.setPath('userData', process.env.ARTCHOLOGY_DATA_DIR)
const hidden = process.env.ARTCHOLOGY_TEST_HEADLESS === '1'
function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 700,
    show: false,
    title: APP.name,
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  window.on('ready-to-show', () => {
    if (!hidden) window.show()
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  optimizer.watchWindowShortcuts(window)
  if (is.dev && process.env.ELECTRON_RENDERER_URL)
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
}
async function result<T>(action: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await action() }
  } catch (error) {
    console.error(error)
    return {
      ok: false,
      error:
        error instanceof ZodError
          ? error.issues.map((issue) => issue.message).join(' / ')
          : error instanceof Error
            ? error.message
            : '저장 중 오류가 발생했습니다.'
    }
  }
}
app
  .whenReady()
  .then(async () => {
    app.setAppUserModelId(APP.id)
    const databasePath = join(app.getPath('userData'), APP.database)
    // A failed read remains an error: never overwrite a damaged database with demo data.
    const database = createStore(databasePath)
    void database.catch((error) => console.error('Database initialization failed:', error))
    ipcMain.handle(IPC.load, () => result(async () => (await database).read()))
    ipcMain.handle(IPC.student, (_, value: unknown) =>
      result(async () => (await database).student(value))
    )
    ipcMain.handle(IPC.session, (_, value: unknown) =>
      result(async () => (await database).session(value))
    )
    ipcMain.handle(IPC.drawing, (_, value: unknown) =>
      result(async () => (await database).drawing(value))
    )
    ipcMain.handle(IPC.settings, (_, value: unknown) =>
      result(async () => (await database).settings(value))
    )
    let pendingBackup: Store | null = null
    ipcMain.handle(IPC.selectBackup, () =>
      result(async () => {
        pendingBackup = null
        const selected = await dialog.showOpenDialog({
          title: '복원할 백업 선택',
          filters: [{ name: 'JSON 백업', extensions: ['json'] }],
          properties: ['openFile']
        })
        if (selected.canceled || !selected.filePaths[0]) return null
        const path = selected.filePaths[0]
        if ((await stat(path)).size > 100_000_000)
          throw new Error('100MB 이하의 백업을 선택해 주세요.')
        pendingBackup = storeSchema.parse(JSON.parse(await readFile(path, 'utf8')))
        return pendingBackup
      })
    )
    ipcMain.handle(IPC.restoreBackup, () =>
      result(async () => {
        if (!pendingBackup) throw new Error('복원할 백업을 먼저 선택하세요.')
        const backup = pendingBackup
        pendingBackup = null
        const current = await (await database).read()
        await writeFile(
          join(app.getPath('userData'), `before-restore-${Date.now()}.json`),
          JSON.stringify(current, null, 2),
          { flag: 'wx' }
        )
        return (await database).restore(backup)
      })
    )
    ipcMain.handle(IPC.export, (_, kind: unknown, rawFilter: unknown) =>
      result(async () => {
        if (kind !== 'backup' && kind !== 'sessions' && kind !== 'report')
          throw new Error('지원하지 않는 내보내기입니다.')
        const filter = reportFilterSchema.parse(rawFilter ?? {})
        const data = await (await database).read()
        const rows = filterSessions(data.sessions, filter)
        const extension = kind === 'backup' ? 'json' : kind === 'report' ? 'pdf' : 'csv'
        const selected = await dialog.showSaveDialog({
          title:
            kind === 'backup'
              ? '전체 데이터 백업'
              : kind === 'report'
                ? '상담 운영 보고서'
                : '상담 기록 내보내기',
          defaultPath: `artchology-${localDate()}.${extension}`,
          filters: [{ name: extension.toUpperCase(), extensions: [extension] }]
        })
        if (selected.canceled || !selected.filePath) return null
        if (kind === 'report') {
          const report = new BrowserWindow({
            show: false,
            webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
          })
          try {
            await report.loadURL(
              'data:text/html;charset=utf-8,' + encodeURIComponent(reportHtml(data, rows, filter))
            )
            await writeFile(
              selected.filePath,
              await report.webContents.printToPDF({ pageSize: 'A4', printBackground: true })
            )
          } finally {
            report.destroy()
          }
        } else {
          await writeFile(
            selected.filePath,
            kind === 'backup' ? JSON.stringify(data, null, 2) : sessionCsv(data, rows),
            'utf8'
          )
        }
        return selected.filePath
      })
    )
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((error) => {
    console.error(error)
    app.quit()
  })
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || hidden) app.quit()
})
