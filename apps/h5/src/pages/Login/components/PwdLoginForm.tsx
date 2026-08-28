import { useState } from 'react'
import { Button, Field } from 'react-vant'

export interface PwdLoginFormProps {
  loading: boolean
  onSubmit: (payload: { account: string; password: string }) => Promise<void> | void
}

/**
 * 账号密码登录（H7 落地）
 * - mock 固定接受 user1/123456（或 user2/123456 等）
 */
export default function PwdLoginForm({ loading, onSubmit }: PwdLoginFormProps) {
  const [account, setAccount] = useState('user1')
  const [password, setPassword] = useState('123456')

  function handleSubmit() {
    void onSubmit({ account, password })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field
        data-testid="login-account"
        label="账号"
        placeholder="user1 / user2 ..."
        value={account}
        onChange={(v: string) => setAccount(v)}
        required
        maxLength={20}
      />
      <Field
        data-testid="login-password"
        type="password"
        label="密码"
        placeholder="123456（mock 默认）"
        value={password}
        onChange={(v: string) => setPassword(v)}
        required
        maxLength={20}
      />
      <Button
        data-testid="login-submit"
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