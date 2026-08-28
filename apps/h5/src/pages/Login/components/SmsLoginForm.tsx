import { useState } from 'react'
import { Button, Field, Toast } from 'react-vant'

export interface SmsLoginFormProps {
  loading: boolean
  onSubmit: (payload: { account: string; code: string }) => Promise<void> | void
}

/**
 * 短信验证码登录（H7 落地）
 * - mock 永远发 1234
 * - 点击「发送验证码」按钮提示「验证码：1234」+ Toast
 */
export default function SmsLoginForm({ loading, onSubmit }: SmsLoginFormProps) {
  const [account, setAccount] = useState('user1')
  const [code, setCode] = useState('1234')
  const [sending, setSending] = useState(false)

  function handleSend() {
    if (!account.trim()) {
      Toast('请先填写账号')
      return
    }
    setSending(true)
    window.setTimeout(() => {
      Toast({ type: 'success', message: '验证码已发送：1234' })
      setSending(false)
      setCode('1234')
    }, 300)
  }

  function handleSubmit() {
    void onSubmit({ account, code })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field
        data-testid="login-sms-account"
        label="手机号/账号"
        placeholder="user1 / user2 ..."
        value={account}
        onChange={(v: string) => setAccount(v)}
        required
        maxLength={20}
      />
      <Field
        data-testid="login-sms-code"
        label="验证码"
        placeholder="1234（mock）"
        value={code}
        onChange={(v: string) => setCode(v)}
        maxLength={6}
        rightIcon={
          <Button size="mini" plain type="primary" onClick={handleSend} loading={sending} style={{ minWidth: 96 }}>
            获取验证码
          </Button>
        }
      />
      <Button
        data-testid="login-sms-submit"
        type="primary"
        block
        round
        loading={loading}
        onClick={handleSubmit}
        style={{ marginTop: 4 }}
      >
        登录
      </Button>
    </div>
  )
}