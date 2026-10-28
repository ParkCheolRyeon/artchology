import { toast } from '../lib/toast'
import { useState } from 'react'
import { useAuthStore } from './auth'
import { useWorkspace } from './context'
import { Button, Field, Surface } from './ui'
import { Input } from '../components/ui/input'

export function PinSettings(): React.JSX.Element {
  const auth = useAuthStore()
  const { notify } = useWorkspace()
  const [pin, setPin] = useState({ current: '', next: '', confirm: '' })
  const [recoveryPin, setRecoveryPin] = useState('')
  const [recovery, setRecovery] = useState('')

  const [busy, setBusy] = useState(false)
  return (
    <div className="wt-stack">
      <Surface className="flex flex-col gap-5">
        <h2>PIN 변경</h2>
        <p className="text-sm text-slate-500">
          앱 진입과 화면 잠금에 사용하는 PIN입니다. 인증은 1시간 후 만료됩니다.
        </p>
        <form
          className="wt-demo-form"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)

            try {
              if (pin.next !== pin.confirm || !(await auth.changePin(pin.current, pin.next))) {
                toast.warn('현재 PIN과 새 PIN 네 자리, 확인 값을 확인하세요.')
                return
              }
              setPin({ current: '', next: '', confirm: '' })
              notify('PIN을 변경했습니다.', 'success')
            } catch {
              toast.error('PIN을 저장하지 못했습니다. 다시 시도해 주세요.')
            } finally {
              setBusy(false)
            }
          }}
        >
          <div className="form-grid">
            {(['current', 'next', 'confirm'] as const).map((key, i) => (
              <Field key={key} label={['현재 PIN', '새 PIN', '새 PIN 확인'][i]}>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  value={pin[key]}
                  onChange={(e) => setPin({ ...pin, [key]: e.target.value.replace(/\D/g, '') })}
                />
              </Field>
            ))}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              PIN 변경
            </Button>
            <Button type="button" variant="secondary" onClick={() => auth.lock()}>
              화면 잠금
            </Button>
          </div>
        </form>
      </Surface>
      <Surface className="flex flex-col gap-5">
        <h2>복구 코드</h2>
        <p className="text-sm text-slate-500">
          PIN을 잊었다면 잠금 화면에서 복구 코드를 사용하세요. 새 코드를 생성하면 이전 코드는 사용할
          수 없습니다.
        </p>
        <Field label="복구 코드 재생성용 현재 PIN">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={recoveryPin}
            onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <Button
          disabled={busy || recoveryPin.length !== 4}
          variant="secondary"
          onClick={async () => {
            setBusy(true)
            try {
              const code = await auth.replaceRecovery(recoveryPin)
              if (!code) notify('현재 PIN이 일치하지 않습니다.', 'warn')
              else {
                setRecovery(code)
                setRecoveryPin('')
              }
            } catch {
              notify('복구 코드를 저장하지 못했습니다.', 'error')
            } finally {
              setBusy(false)
            }
          }}
        >
          복구 코드 재생성
        </Button>
        {recovery && (
          <div className="rounded-lg border bg-blue-50 p-4">
            <code className="break-all">{recovery}</code>
            <p className="mt-3 text-sm">이 코드를 안전한 곳에 보관해 주세요.</p>
          </div>
        )}
      </Surface>
    </div>
  )
}
