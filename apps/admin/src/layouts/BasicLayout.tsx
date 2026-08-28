import { Layout, Menu, Dropdown, Avatar, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  SoundOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  IdcardOutlined,
  DownloadOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ADMIN_ROUTES } from '@trae/shared'
import DevMockToolbar from '@/components/DevMockToolbar'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: ADMIN_ROUTES.dashboard, icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: ADMIN_ROUTES.concertList, icon: <SoundOutlined />, label: '演出管理' },
  { key: ADMIN_ROUTES.orderManage, icon: <FileTextOutlined />, label: '订单管理' },
  { key: ADMIN_ROUTES.userManage, icon: <TeamOutlined />, label: '用户管理' },
  /** H8 新增：观演人管理（只读） */
  { key: ADMIN_ROUTES.adminViewersManage, icon: <IdcardOutlined />, label: '观演人' },
  /** H10 新增：导出中心 */
  { key: ADMIN_ROUTES.exportCenter, icon: <DownloadOutlined />, label: '导出中心' },
]

export default function BasicLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const selectedKey =
    menuItems.find((m) => pathname.startsWith(m.key))?.key ?? ADMIN_ROUTES.dashboard

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => navigate(ADMIN_ROUTES.login),
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div
          style={{
            height: 64,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          演唱会票务后台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
          }}
        >
          <Typography.Text type="secondary">管理后台</Typography.Text>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>管理员</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16 }}>
          <Outlet />
        </Content>
      </Layout>
      <DevMockToolbar />
    </Layout>
  )
}