import { toast } from '../lib/toast'
import { useEffect, useState, type ReactNode } from 'react'
import { LockKeyhole, ArrowLeft, Check, Copy } from 'lucide-react'
import { BrandIcon } from '../components/BrandIcon'
import { Input } from '../components/ui/input'
import { FormCheckbox, FormSelect } from '../components/form-controls'
import { Button, Field } from './ui'
import { useAuthStore, createRecoveryCode, type SetupProfile } from './auth'
import { useWorkspaceStore } from './store'

const emptyProfile: SetupProfile = {
  school: '',
  schoolType: '초등학교',
  weeClass: 'Wee클래스',
  counselor: '',
  affiliation: '전문상담교사',
  classification: '개인상담'
}
function PinInput({
  label,
  value,
  onChange,
  autoFocus = false
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}): React.JSX.Element {
  return (
    <Field label={label}>
      <Input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        autoFocus={autoFocus}
        className="h-12 text-center text-xl tracking-[0.5em]"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        required
      />
    </Field>
  )
}
export function AuthBoundary({ children }: { children: ReactNode }): React.JSX.Element {
  const expiresAt = useAuthStore((s) => s.expiresAt)
  const lock = useAuthStore((s) => s.lock)
  const unlocked = expiresAt > 0
  useEffect(() => {
    if (!expiresAt) return
    const check = (): void => {
      if (Date.now() >= expiresAt) lock('expired')
    }
    const timer = setTimeout(check, Math.max(0, expiresAt - Date.now()))
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [expiresAt, lock])
  const guard = (event: React.SyntheticEvent): void => {
    if (expiresAt && Date.now() >= expiresAt) {
      event.preventDefault()
      event.stopPropagation()
      lock('expired')
    }
  }
  return unlocked ? (
    <div onClickCapture={guard} onKeyDownCapture={guard}>
      {children}
    </div>
  ) : (
    <AuthGate />
  )
}
function AuthGate(): React.JSX.Element {
  const auth = useAuthStore()
  const [experience, setExperience] = useState(false)
  const [step, setStep] = useState<'pin' | 'recovery' | 'profile'>('pin')
  const [recovering, setRecovering] = useState(false)
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [recovery, setRecovery] = useState('')
  const [recoveryInput, setRecoveryInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState<SetupProfile>({ ...emptyProfile })

  const [busy, setBusy] = useState(false)
  const setup = !auth.device || experience
  function reset(): void {
    setExperience(false)
    setRecovering(false)
    setStep('pin')
    setPin('')
    setConfirm('')
    setRecovery('')
    setRecoveryInput('')
    setSaved(false)

    setProfile({ ...emptyProfile })
  }
  async function finish(skip = false): Promise<void> {
    if (experience) {
      reset()
      return
    }
    setBusy(true)

    try {
      const completed = skip
        ? { ...emptyProfile }
        : { ...profile, school: profile.school.trim(), counselor: profile.counselor.trim() }
      await auth.setup(pin, recovery, completed)
      useWorkspaceStore.getState().setData((d) => ({
        ...d,
        settings: {
          ...d.settings,
          counselor: completed.counselor || d.settings.counselor,
          affiliation: completed.affiliation,
          defaultClassification: completed.classification
        },
        schools: d.schools.map((s) =>
          s.id === d.activeSchoolId
            ? {
                ...s,
                name: completed.school || s.name,
                type: completed.schoolType,
                weeClass: completed.weeClass
              }
            : s
        )
      }))
    } catch {
      toast.error('설정을 저장하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main
      className="fixed inset-0 z-50 overflow-y-auto bg-[#f8fafc]"
      aria-label={setup ? '처음 사용 설정' : 'PIN 잠금 화면'}
    >
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center gap-3">
          <BrandIcon size={34} />
          <span className="font-semibold text-slate-700">Artchology</span>
          <span className="ml-auto text-xs text-slate-400">상담실 프로토타입</span>
        </header>
        <div className="flex flex-1 items-center justify-center py-10">
          <section
            className={`w-full rounded-2xl border bg-white p-8 shadow-sm ${setup && step === 'profile' ? 'max-w-xl' : 'max-w-md'}`}
          >
            {experience && (
              <div className="mb-6 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                초기 흐름 체험 중 · 기존 PIN과 상담 자료는 변경되지 않습니다.
              </div>
            )}
            {setup ? (
              <>
                <ol aria-label="초기 설정 단계" className="mb-7 flex gap-4 text-xs text-slate-400">
                  {['PIN 설정', '복구 코드', '기본 정보'].map((label, i) => (
                    <li
                      key={label}
                      className={
                        ['pin', 'recovery', 'profile'][i] === step
                          ? 'font-semibold text-blue-600'
                          : ''
                      }
                    >
                      {i + 1}. {label}
                    </li>
                  ))}
                </ol>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {step === 'pin'
                    ? '상담 기록을 보호할 PIN을 설정하세요.'
                    : step === 'recovery'
                      ? '복구 코드 생성'
                      : '기본 정보'}
                </h1>
                <p className="mt-3 mb-7 text-sm leading-6 text-slate-500">
                  {step === 'pin'
                    ? '다음부터 이 PIN으로 상담 공간에 들어옵니다. 인증은 1시간 동안 유지됩니다.'
                    : step === 'recovery'
                      ? 'PIN을 잊었을 때 다시 설정할 수 있도록 복구 코드를 보관해 주세요.'
                      : '학교와 상담사 정보를 입력하세요. 나중에 설정에서 바꿀 수 있습니다.'}
                </p>
                {step === 'pin' && (
                  <form
                    className="wt-demo-form"
                    onSubmit={(e) => {
                      e.preventDefault()

                      if (!/^\d{4}$/.test(pin) || pin !== confirm) {
                        toast.warn('PIN 네 자리와 확인 값을 동일하게 입력하세요.')
                        return
                      }
                      setRecovery(createRecoveryCode())
                      setSaved(false)
                      setCopied(false)
                      setStep('recovery')
                    }}
                  >
                    <PinInput autoFocus label="PIN 설정" value={pin} onChange={setPin} />
                    <PinInput label="PIN 확인" value={confirm} onChange={setConfirm} />

                    <Button type="submit">다음</Button>
                  </form>
                )}
                {step === 'recovery' && (
                  <div className="flex flex-col gap-5">
                    <div className="rounded-xl border bg-slate-50 p-4">
                      <p className="mb-2 text-xs text-slate-500">복구 코드</p>
                      <code
                        className="break-all text-base font-semibold tracking-wide"
                        data-testid="setup-recovery-code"
                      >
                        {recovery}
                      </code>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(recovery)
                          setCopied(true)
                        } catch {
                          toast.error('복사하지 못했습니다. 코드를 직접 선택해 보관해 주세요.')
                        }
                      }}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? '복사됨' : '복구 코드 복사'}
                    </Button>
                    <label className="flex items-center gap-2 text-sm">
                      <FormCheckbox checked={saved} onCheckedChange={setSaved} />
                      안전한 곳에 보관했습니다.
                    </label>

                    <Button
                      disabled={!saved}
                      onClick={() => {
                        setStep('profile')
                      }}
                    >
                      다음
                    </Button>
                  </div>
                )}
                {step === 'profile' && (
                  <form
                    className="wt-demo-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void finish()
                    }}
                  >
                    <div className="form-grid">
                      <Field label="학교">
                        <Input
                          value={profile.school}
                          onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                          placeholder="학교 이름"
                        />
                      </Field>
                      <Field label="학교급">
                        <FormSelect
                          value={profile.schoolType}
                          onValueChange={(v) => setProfile({ ...profile, schoolType: v })}
                        >
                          {['초등학교', '중학교', '고등학교', '특수학교', '기타'].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </FormSelect>
                      </Field>
                      <Field label="Wee설치여부">
                        <FormSelect
                          value={profile.weeClass}
                          onValueChange={(v) => setProfile({ ...profile, weeClass: v })}
                        >
                          {['Wee클래스', 'Wee센터', '일반'].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </FormSelect>
                      </Field>
                      <Field label="상담사 이름">
                        <Input
                          value={profile.counselor}
                          onChange={(e) => setProfile({ ...profile, counselor: e.target.value })}
                        />
                      </Field>
                      <Field label="상담사 소속">
                        <FormSelect
                          value={profile.affiliation}
                          onValueChange={(v) => setProfile({ ...profile, affiliation: v })}
                        >
                          {['전문상담교사', '전문상담사', '기타'].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </FormSelect>
                      </Field>
                      <Field label="상담분류 기본값">
                        <FormSelect
                          value={profile.classification}
                          onValueChange={(v) => setProfile({ ...profile, classification: v })}
                        >
                          {['개인상담', '집단상담', '심리검사', '교육', '자문', '연구', '기타'].map(
                            (v) => (
                              <option key={v}>{v}</option>
                            )
                          )}
                        </FormSelect>
                      </Field>
                    </div>

                    <Button type="submit" disabled={busy}>
                      {experience ? '체험 마치고 PIN 화면으로' : '상담실 시작하기'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void finish(true)}
                    >
                      건너뛰기 (나중에 설정에서 입력)
                    </Button>
                  </form>
                )}
              </>
            ) : (
              <>
                <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <LockKeyhole size={24} />
                </div>
                <h1 className="text-2xl font-semibold">
                  {recovering ? 'PIN 다시 설정' : '상담 공간 열기'}
                </h1>
                <p className="mt-3 mb-7 text-sm leading-6 text-slate-500">
                  {recovering
                    ? '보관한 복구 코드와 새 PIN을 입력해 주세요.'
                    : auth.reason === 'expired'
                      ? '인증 후 1시간이 지나 잠겼습니다. PIN을 다시 입력해 주세요.'
                      : '등록한 PIN 네 자리로 상담 공간에 들어오세요.'}
                </p>
                <form
                  className="wt-demo-form"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setBusy(true)

                    try {
                      if (recovering && pin !== confirm) {
                        toast.warn('새 PIN과 확인 값이 일치하지 않습니다.')
                        return
                      }
                      const ok = recovering
                        ? await auth.recover(recoveryInput, pin)
                        : await auth.unlock(pin)
                      if (!ok)
                        toast.error(
                          recovering
                            ? '복구 코드 또는 새 PIN을 확인해 주세요.'
                            : 'PIN이 일치하지 않습니다.'
                        )
                    } catch {
                      toast.error('인증을 완료하지 못했습니다. 다시 시도해 주세요.')
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  {recovering && (
                    <Field label="복구 코드">
                      <Input
                        value={recoveryInput}
                        onChange={(e) => setRecoveryInput(e.target.value)}
                        required
                      />
                    </Field>
                  )}
                  <PinInput
                    autoFocus
                    label={recovering ? '새 PIN' : 'PIN'}
                    value={pin}
                    onChange={setPin}
                  />
                  {recovering && (
                    <PinInput label="새 PIN 확인" value={confirm} onChange={setConfirm} />
                  )}

                  <Button type="submit" disabled={busy}>
                    {busy ? '확인 중…' : recovering ? 'PIN 재설정 후 시작' : '잠금 해제'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setRecovering(!recovering)
                      setPin('')
                      setConfirm('')
                    }}
                  >
                    {recovering ? 'PIN 입력으로 돌아가기' : 'PIN을 잊으셨나요?'}
                  </Button>
                </form>
              </>
            )}
            <p className="mt-6 border-t pt-4 text-xs leading-5 text-slate-400">
              PIN은 이 기기의 앱 잠금용입니다. 구글·이메일 계정 로그인과 별개이며, 실제 상담 데이터
              암호화는 연결 전입니다.
            </p>
          </section>
        </div>
        <footer className="flex min-h-10 justify-end">
          {auth.device &&
            (experience ? (
              <Button variant="ghost" onClick={reset}>
                <ArrowLeft size={15} />
                기존 PIN 화면으로 돌아가기
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  reset()
                  setExperience(true)
                }}
              >
                초기 flow 경험하기
              </Button>
            ))}
        </footer>
      </div>
    </main>
  )
}
