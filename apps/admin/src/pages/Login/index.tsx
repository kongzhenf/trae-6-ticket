import { Button, Card, Form, Input, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { ADMIN_ROUTES } from '@trae/shared'
import PrdButton from '@/components/PrdButton'
import PrdSidePanel from '@/components/PrdSidePanel'
import { usePrdPanel } from '@/hooks/usePrdPanel'

export default function Login() {
  const navigate = useNavigate()
  const { isOpen, toggle, close, markdown } = usePrdPanel('Login')

  function handleSubmit() {
    // 占位：登录逻辑后续实现
    navigate(ADMIN_ROUTES.dashboard)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 360 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          管理后台登录
        </Typography.Title>
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="账号" name="account" rules={[{ required: true }]}>
            <Input placeholder="请输入账号" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            登录
          </Button>
        </Form>
      </Card>
      <PrdButton isOpen={isOpen} onToggle={toggle} />
      <PrdSidePanel
        open={isOpen}
        onClose={close}
        title="Login · PRD"
        markdown={markdown}
      />
    </div>
  )
}
