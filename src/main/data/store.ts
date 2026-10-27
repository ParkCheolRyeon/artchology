import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  drawingInput,
  sessionInput,
  settingsSchema,
  storeSchema,
  studentInput,
  localDate,
  type Store
} from '../../shared/model'
import { createSeed } from './seed'

interface LocalStore {
  read: () => Promise<Store>
  student: (raw: unknown) => Promise<Store>
  session: (raw: unknown) => Promise<Store>
  drawing: (raw: unknown) => Promise<Store>
  settings: (raw: unknown) => Promise<Store>
  restore: (raw: unknown) => Promise<Store>
}
export async function createStore(path: string): Promise<LocalStore> {
  await mkdir(dirname(path), { recursive: true })
  const db = new Low<Store>(new JSONFile<Store>(path), createSeed())
  await db.read()
  db.data = storeSchema.parse(db.data)
  await db.write()
  let queue: Promise<unknown> = Promise.resolve()
  function update(action: (draft: Store) => void): Promise<Store> {
    const operation = queue.then(async () => {
      const previous = db.data
      const next = structuredClone(previous)
      action(next)
      db.data = storeSchema.parse(next)
      try {
        await db.write()
      } catch (error) {
        db.data = previous
        throw error
      }
      return structuredClone(db.data)
    })
    queue = operation.catch(() => undefined)
    return operation
  }
  return {
    read: async (): Promise<Store> => {
      await queue
      return structuredClone(db.data)
    },
    student: (raw: unknown) =>
      update((data) => {
        const value = studentInput.parse(raw)
        const existing = value.id ? data.students.find((row) => row.id === value.id) : undefined
        if (value.id && !existing) throw new Error('학생을 찾을 수 없습니다.')
        const row = {
          ...value,
          id: existing?.id ?? randomUUID(),
          createdAt: existing?.createdAt ?? localDate()
        }
        if (existing) data.students[data.students.indexOf(existing)] = row
        else data.students.push(row)
      }),
    session: (raw: unknown) =>
      update((data) => {
        const value = sessionInput.parse(raw)
        if (!data.students.some((row) => row.id === value.studentId))
          throw new Error('학생을 찾을 수 없습니다.')
        const existing = value.id ? data.sessions.find((row) => row.id === value.id) : undefined
        if (value.id && !existing) throw new Error('상담 기록을 찾을 수 없습니다.')
        const row = { ...value, id: existing?.id ?? randomUUID() }
        if (existing) data.sessions[data.sessions.indexOf(existing)] = row
        else data.sessions.push(row)
      }),
    drawing: (raw: unknown) =>
      update((data) => {
        const value = drawingInput.parse(raw)
        if (!data.students.some((row) => row.id === value.studentId))
          throw new Error('학생을 찾을 수 없습니다.')
        data.drawings.push({ ...value, id: randomUUID(), createdAt: new Date().toISOString() })
      }),
    restore: (raw: unknown) =>
      update((data) => {
        const restored = storeSchema.parse(raw)
        const ids = new Set(restored.students.map((row) => row.id))
        if (
          ids.size !== restored.students.length ||
          new Set(restored.sessions.map((row) => row.id)).size !== restored.sessions.length ||
          new Set(restored.drawings.map((row) => row.id)).size !== restored.drawings.length ||
          [...restored.sessions, ...restored.drawings].some((row) => !ids.has(row.studentId))
        )
          throw new Error('백업의 학생 연결 또는 기록 ID가 올바르지 않습니다.')
        Object.assign(data, restored)
      }),
    settings: (raw: unknown) =>
      update((data) => {
        data.settings = settingsSchema.parse(raw)
      })
  }
}
