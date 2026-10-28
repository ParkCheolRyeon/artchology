import { toast } from '../lib/toast'
import { useState } from 'react'
import { useWorkspace } from './context'
import { Surface, Button, Field, Modal, Badge } from './ui'
import { Input } from '../components/ui/input'
import { LogOut, Ticket, Mail } from 'lucide-react'

export function AccountPanel(): React.JSX.Element {
  const { data, setData, notify } = useWorkspace()
  const { account } = data
  const [modal, setModal] = useState<'login' | 'redeem' | 'delete' | ''>('')
  const [step, setStep] = useState<'email' | 'code' | 'google'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [confirm, setConfirm] = useState('')

  function open(next: typeof modal): void {
    setModal(next)
    setStep('email')

    setCode('')
    setConfirm('')
    setEmail('')
  }
  function login(address: string): void {
    setData((d) => ({
      ...d,
      account: {
        email: address,
        logged: true,
        subscribed: d.account.email === address && d.account.subscribed
      }
    }))
    setModal('')
    notify('로그인 시연을 완료했습니다.', 'success')
  }
  return (
    <Surface className="flex flex-col gap-6">
      <div>
        <h2>구독 / 계정</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          로그인한 계정과 이용권 상태를 확인합니다.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="break-all font-medium">
            {account.logged ? account.email : '로그인되지 않음'}
          </p>
          {account.logged && (
            <p className="mt-1 text-sm text-muted-foreground">
              플랜: {account.subscribed ? '플러스 플랜' : '무료 플랜'}
            </p>
          )}
        </div>
        <Badge tone={account.logged && account.subscribed ? 'green' : 'gray'}>
          {!account.logged ? '로그인 필요' : account.subscribed ? '구독 중' : '무료 플랜'}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-5">
        {!account.logged ? (
          <Button onClick={() => open('login')}>로그인</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => open('redeem')}>
              <Ticket size={16} />
              구독 코드 등록
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setData((d) => ({ ...d, account: { ...d.account, logged: false } }))
                notify('로그아웃했습니다.', 'success')
              }}
            >
              <LogOut size={16} />
              로그아웃
            </Button>
            <Button
              variant="ghost"
              className="ml-auto text-destructive"
              onClick={() => open('delete')}
            >
              계정 삭제
            </Button>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        시연 모드 · 계정 인증·구독은 화면에서만 적용되며 실제 메일 발송이나 결제는 발생하지
        않습니다.
      </p>
      {modal === 'login' && (
        <Modal
          compact
          title={
            step === 'email' ? '로그인' : step === 'code' ? '인증 코드 입력' : '구글 로그인 진행 중'
          }
          onClose={() => setModal('')}
        >
          <form
            className="wt-demo-form"
            onSubmit={(e) => {
              e.preventDefault()

              if (step === 'email') {
                setStep('code')
                return
              }
              if (step === 'code') {
                if (code !== '123456') {
                  toast.warn('인증 코드가 일치하지 않습니다. 시연 코드 123456을 입력하세요.')
                  return
                }
                login(email.trim().toLowerCase())
              }
            }}
          >
            {step === 'email' && (
              <>
                <p className="text-sm text-muted-foreground">
                  가입과 로그인이 한 번에 진행됩니다. 새 비밀번호를 만들지 않아요.
                </p>
                <Button
                  variant="secondary"
                  type="button"
                  className="w-full"
                  onClick={() => setStep('google')}
                >
                  구글 계정으로 로그인
                </Button>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  또는 이메일로
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Field label="이메일">
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@school.kr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  이미 이메일로 가입한 적이 있다면 같은 주소의 구글 계정으로 로그인해 주세요.
                </p>
              </>
            )}
            {step === 'code' && (
              <>
                <p className="text-sm text-muted-foreground">
                  {email}의 인증 코드를 입력해 주세요.
                </p>
                <Field label="인증 코드">
                  <Input
                    autoFocus
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className="tracking-[0.4em]"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
                <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                  메일 발송 시연 · 인증 코드 123456
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep('email')
                    setCode('')
                  }}
                >
                  이메일 다시 입력 / 코드 다시 받기
                </Button>
              </>
            )}
            {step === 'google' && (
              <>
                <p>브라우저에서 계정을 선택하고 앱으로 돌아오는 흐름입니다.</p>
                <p className="text-sm text-muted-foreground">
                  실제 구글에 연결하지 않는 시연입니다.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => login('teacher@example.com')}
                >
                  <Mail size={16} />
                  teacher@example.com으로 계속
                </Button>
              </>
            )}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => (step === 'google' ? setStep('email') : setModal(''))}
              >
                취소
              </Button>
              {step !== 'google' && (
                <Button type="submit">{step === 'email' ? '인증 코드 받기' : '확인'}</Button>
              )}
            </div>
          </form>
        </Modal>
      )}
      {modal === 'redeem' && (
        <Modal compact title="구독 코드 등록" onClose={() => setModal('')}>
          <form
            className="wt-demo-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (code.replace(/[-\s]/g, '').toUpperCase() !== 'WEEDAMDEMODEMODEMO') {
                toast.warn('시연용 구독 코드를 확인해 주세요.')
                return
              }
              setData((d) => ({ ...d, account: { ...d.account, subscribed: true } }))
              setModal('')
              notify('구독 등록 시연을 완료했습니다.', 'success')
            }}
          >
            <p>발급받은 구독 코드를 입력하면 구독이 이 계정에 연결됩니다.</p>
            <Field label="구독 코드">
              <Input
                required
                autoFocus
                placeholder="WEEDAM-XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              하이픈·공백이 섞여 있어도 입력할 수 있습니다.
            </p>
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              시연 코드: WEEDAM-DEMO-DEMO-DEMO
              <br />
              실제 이용권 등록과 결제는 발생하지 않습니다.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModal('')}>
                취소
              </Button>
              <Button type="submit">등록</Button>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal compact title="계정 삭제" onClose={() => setModal('')}>
          <form
            className="wt-demo-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (confirm.trim().toLowerCase() !== account.email.toLowerCase()) return
              setData((d) => ({ ...d, account: { email: '', logged: false, subscribed: false } }))
              setModal('')
              notify('계정 삭제 시연을 완료했습니다. 상담 기록과 PIN은 유지됩니다.', 'success')
            }}
          >
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3>삭제되는 항목</h3>
              <p className="mt-2 text-sm">계정 정보(이메일)와 로그인 수단, 구독 좌석</p>
            </div>
            <div className="rounded-lg border p-4">
              <h3>그대로 남는 항목</h3>
              <p className="mt-2 text-sm">상담 기록 전체 — 학생·사례·회기·기록물철과 앱 잠금 PIN</p>
            </div>
            <p className="text-sm text-muted-foreground">
              계정 삭제 시연입니다. 이번 실행의 계정 상태만 초기화됩니다.
            </p>
            <Field label="확인을 위해 로그인 이메일을 입력해 주세요">
              <Input
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={account.email}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModal('')}>
                취소
              </Button>
              <Button
                type="submit"
                disabled={confirm.trim().toLowerCase() !== account.email.toLowerCase()}
              >
                계정 삭제
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Surface>
  )
}
