import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Tabs, Toast } from 'react-vant'
import type { LoginPayload } from '@trae/shared'
import { errorCodeMessage } from '@trae/shared'
import PrdPanelHost from '@/components/PrdPanelHost'
import { useUser } from '@/contexts/UserContext'
import PwdLoginForm from './components/PwdLoginForm'
import SmsLoginForm from './components/SmsLoginForm'

const TAB_PWD = 'pwd'
const TAB_SMS = 'sms'

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') ?? '/'
  const [active, setActive] = useState<typeof TAB_PWD | typeof TAB_SMS>(TAB_PWD)
  const [submitting, setSubmitting] = useState(false)
  const { login } = useUser()

  const handlePwd = useCallback(
    async (payload: { account: string; password: string }) => {
      setSubmitting(true)
      try {
        await login(payload)
        Toast({ type: 'success', message: '登录成功' })
        navigate(decodeURIComponent(redirect), { replace: true })
      } catch (e) {
        const er = e as { response?: { data?: { code?: number; message?: string } } }
        Toast(errorCodeMessage(er?.response?.data?.code ?? 0, er?.response?.data?.message ?? '登录失败'))
      } finally {
        setSubmitting(false)
      }
    },
    [login, navigate, redirect],
  )

  const handleSms = useCallback(
    async (payload: { account: string; code: string }) => {
      setSubmitting(true)
      try {
        const p: LoginPayload = { account: payload.account, password: 'mock', code: payload.code }
        await login(p)
        Toast({ type: 'success', message: '登录成功' })
        navigate(decodeURIComponent(redirect), { replace: true })
      } catch (e) {
        const er = e as { response?: { data?: { code?: number; message?: string } } }
        Toast(errorCodeMessage(er?.response?.data?.code ?? 0, er?.response?.data?.message ?? '登录失败'))
      } finally {
        setSubmitting(false)
      }
    },
    [login, navigate, redirect],
  )

  return (
    <PrdPanelHost pageKey="Login">
      <div
        data-testid="login-page"
        style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            height: 46,
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <button
            type="button"
            aria-label="返回"
            onClick={() => navigate(-1)}
            style={{ background: 'transparent', border: 0, padding: 4, fontSize: 22, color: '#64748b', cursor: 'pointer' }}
          >
            ‹
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>登录</div>
          <div style={{ width: 24 }} />
        </header>

        <div style={{ padding: '24px 16px 16px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>欢迎回来</div>
          <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
            使用 mock 账号登录：<code>user1 / 123456</code>（验证码恒为 1234）
          </div>
        </div>

        <Tabs
          active={active}
          onChange={(k: string | number) => setActive(k as typeof TAB_PWD | typeof TAB_SMS)}
          type="line"
          sticky
          swipeable={false}
          titleActiveColor="#1677ff"
        >
          <Tabs.TabPane key={TAB_PWD} title="账号密码" name={TAB_PWD}>
            <div style={{ padding: '16px 16px 0' }}>
              <PwdLoginForm loading={submitting} onSubmit={handlePwd} />
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane key={TAB_SMS} title="验证码登录" name={TAB_SMS}>
            <div style={{ padding: '16px 16px 0' }}>
              <SmsLoginForm loading={submitting} onSubmit={handleSms} />
            </div>
          </Tabs.TabPane>
        </Tabs>

        <div style={{ flex: 1 }} />
      </div>
    </PrdPanelHost>
  )
}