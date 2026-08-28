import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ADMIN_ROUTES, formatDate, maskPhone } from '@trae/shared'
import type { User } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'
import PrdPanelHost from '@/components/PrdPanelHost'

const { Title } = Typography

type Row = User

/**
 * 用户管理（H8 加「观演人」按钮跳到 /users/viewers?userId=...）
 * - 列表接 userApi.listUsers（mock 简单实现：返回 mock token 用户的全量）
 *   注：mock 暂无 list users handler；这里直接通过 useApi().user.me + 现有 mock 数据访问
 * - 操作列：观演人 / 详情（占位）
 */
export default function UserManage() {
  const navigate = useNavigate()
  const { client } = useApi()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        // mock 暂无 GET /users；先通过 mock store 直接读 db.users
        // 为 admin 提供稳定展示，使用 client.get('/users') 走未匹配路径会 404；这里用 dbStats 侧路
        // 简化方案：admin 直接访问 mock localStorage；这里先写空态占位
        const data = await readAllUsersFromMock()
        if (!cancelled) setRows(data)
      } catch (e) {
        console.warn('[UserManage] load failed', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [client])

  const columns: ColumnsType<Row> = [
    { title: '用户 ID', dataIndex: 'id', key: 'id', width: 120, fixed: 'left' },
    { title: '昵称', dataIndex: 'nickname', key: 'nickname', width: 140 },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (v?: string) => (v ? maskPhone(v) : '—'),
    },
    {
      title: '实名',
      key: 'realName',
      width: 140,
      render: (_v, r) => (r.realName ?? '—'),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (v: User['role']) => <Tag color={v === 'admin' ? 'gold' : 'blue'}>{v}</Tag>,
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => formatDate(v),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_v, r) => (
        <Button
          type="link"
          onClick={() => navigate(`${ADMIN_ROUTES.adminViewersManage}?userId=${r.id}`)}
          data-testid={`um-viewers-${r.id}`}
        >
          观演人
        </Button>
      ),
    },
  ]

  return (
    <PrdPanelHost pageKey="UserManage">
      <div className="admin-content" data-testid="user-manage-root">
        <Title level={3}>用户管理</Title>
        <Card>
          <Table<Row>
            rowKey="id"
            size="middle"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 800 }}
            locale={{ emptyText: '暂无用户' }}
            data-testid="um-table"
          />
        </Card>
      </div>
    </PrdPanelHost>
  )
}

/**
 * 直接从 mock localStorage 读取用户列表（mock 暂无 GET /users 列表接口；本侧路只为 admin 展示用）
 */
async function readAllUsersFromMock(): Promise<Row[]> {
  try {
    const raw = localStorage.getItem('concert_mock_db_v1')
    if (!raw) return []
    const db = JSON.parse(raw)
    const users = db?.users ?? []
    return users as Row[]
  } catch {
    return []
  }
}
