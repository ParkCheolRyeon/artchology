import { create } from 'zustand'

export const AUTH_TTL = 60 * 60 * 1000
const DEVICE_KEY = 'artchology.prototype.device.v1'
const SESSION_KEY = 'artchology.prototype.unlock.v1'
export interface SetupProfile {
  school: string
  schoolType: string
  weeClass: string
  counselor: string
  affiliation: string
  classification: string
}
interface Device {
  salt: string
  pinHash: string
  recoveryHash: string
  profile: SetupProfile
}
function loadDevice(): Device | null {
  try {
    const d = JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null')
    if (
      !d ||
      typeof d.salt !== 'string' ||
      !/^[a-f0-9]{64}$/.test(d.pinHash) ||
      !/^[a-f0-9]{64}$/.test(d.recoveryHash)
    )
      return null
    if (
      !d.profile ||
      !['school', 'schoolType', 'weeClass', 'counselor', 'affiliation', 'classification'].every(
        (k) => typeof d.profile[k] === 'string'
      )
    )
      return null
    return d as Device
  } catch {
    return null
  }
}
async function digest(value: string, salt: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${value}`))
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}
export function createRecoveryCode(): string {
  return `ART-${crypto
    .randomUUID()
    .replaceAll('-', '')
    .toUpperCase()
    .match(/.{1,8}/g)!
    .join('-')}`
}
function readSession(): number {
  try {
    const value = Number(sessionStorage.getItem(SESSION_KEY))
    return value > Date.now() && value <= Date.now() + AUTH_TTL ? value : 0
  } catch {
    return 0
  }
}
const initialDevice = loadDevice()
interface AuthState {
  device: Device | null
  expiresAt: number
  reason: 'startup' | 'manual' | 'expired'
  lock: (reason?: 'manual' | 'expired') => void
  unlock: (pin: string) => Promise<boolean>
  setup: (pin: string, recovery: string, profile: SetupProfile) => Promise<void>
  changePin: (current: string, next: string) => Promise<boolean>
  recover: (code: string, next: string) => Promise<boolean>
  replaceRecovery: (pin: string) => Promise<string | null>
}
function saveDevice(device: Device): void {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(device))
}
function newSession(): number {
  const until = Date.now() + AUTH_TTL
  sessionStorage.setItem(SESSION_KEY, String(until))
  return until
}
export const useAuthStore = create<AuthState>((set, get) => ({
  device: initialDevice,
  expiresAt: initialDevice ? readSession() : 0,
  reason: 'startup',
  lock: (reason = 'manual') => {
    sessionStorage.removeItem(SESSION_KEY)
    set({ expiresAt: 0, reason })
  },
  unlock: async (pin) => {
    const device = get().device
    if (!device || !/^\d{4}$/.test(pin) || (await digest(pin, device.salt)) !== device.pinHash)
      return false
    set({ expiresAt: newSession(), reason: 'startup' })
    return true
  },
  setup: async (pin, recovery, profile) => {
    if (!/^\d{4}$/.test(pin)) throw new Error('PIN은 숫자 네 자리여야 합니다.')
    const salt = crypto.randomUUID()
    const device = {
      salt,
      pinHash: await digest(pin, salt),
      recoveryHash: await digest(recovery, salt),
      profile
    }
    saveDevice(device)
    set({ device, expiresAt: newSession(), reason: 'startup' })
  },
  changePin: async (current, next) => {
    const device = get().device
    if (!device || !/^\d{4}$/.test(next) || (await digest(current, device.salt)) !== device.pinHash)
      return false
    const updated = { ...device, pinHash: await digest(next, device.salt) }
    saveDevice(updated)
    set({ device: updated })
    return true
  },
  recover: async (code, next) => {
    const device = get().device
    if (
      !device ||
      !/^\d{4}$/.test(next) ||
      (await digest(code.trim().toUpperCase(), device.salt)) !== device.recoveryHash
    )
      return false
    const updated = { ...device, pinHash: await digest(next, device.salt) }
    saveDevice(updated)
    set({ device: updated, expiresAt: newSession(), reason: 'startup' })
    return true
  },
  replaceRecovery: async (pin) => {
    const device = get().device
    if (!device || (await digest(pin, device.salt)) !== device.pinHash) return null
    const code = createRecoveryCode()
    const updated = { ...device, recoveryHash: await digest(code, device.salt) }
    saveDevice(updated)
    set({ device: updated })
    return code
  }
}))
