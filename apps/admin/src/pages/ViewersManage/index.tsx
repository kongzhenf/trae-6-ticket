import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Form, Input, Button, Table, Tag, Space, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { maskIdCard, maskPhone } from '@trae/shared'
import type { Viewer } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'
import PrdPanelHost from '@/components/PrdPanelHost'

interface Row extends Viewer {
  // H8 列定义需要的占位字段（暂未新增列）
  _placeholder?: never
}

/**
 * 观演人管理（H8 实装，admin 只读）
 * - 顶部筛选：userId / 关键词（姓名 / 手机号 / 身份证子串）/ 时间范围占位
 * - 表格列：观演人 ID / 姓名 / 身份证脱敏 / 手机号脱敏 / 归属用户 ID / 更新时间
 * - 数据源：viewerApi.listViewers(userId)
 * - 顶部 PrdPanelHost 渲染对应 PRD
 */
export default function ViewersManage() {
  const { viewer: api } = useApi()
  const [params, setParams] = useSearchParams()
  const [form] = Form.useForm()
  const [rows, setRows] = useState<Row[]>([])
  const [allLoaded, setAllLoaded] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, filtered: 0 })

  // 从 URL 读取 userId 默认值
  const urlUserId = params.get('userId') ?? ''

  useEffect(() => {
    if (urlUserId) form.setFieldsValue({ userId: urlUserId })
    if (urlUserId) void doFetch(urlUserId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlUserId])

  async function doFetch(userId: string) {
    if (!userId) {
      setAllLoaded([])
      setRows([])
      setStats({ total: 0, filtered: 0 })
      return
    }
    setLoading(true)
    try {
      const list = await api.listViewers(userId)
      setAllLoaded(list)
      setStats(s => ({ ...s, total: list.length }))
      applyClientFilter(list, form.getFieldsValue())
    } catch (e) {
      console.error('[ViewersManage] fetch failed', e)
      setAllLoaded([])
    } finally {
      setLoading(false)
    }
  }

  function applyClientFilter(source: Row[], values: { userId?: string; keyword?: string }) {
    const kw = (values.keyword ?? '').trim().toLowerCase()
    const filtered = source.filter(v => {
      if (kw) {
        const hit =
          v.name.toLowerCase().includes(kw) ||
          v.phone.includes(kw) ||
          v.idCardCipher.toLowerCase().includes(kw) ||
          v.id.toLowerCase().includes(kw)
        if (!hit) return false
      }
      return true
    })
    setRows(filtered)
    setStats(s => ({ ...s, filtered: filtered.length }))
  }

  function onSearch(values: { userId?: string; keyword?: string }) {
    const userId = (values.userId ?? '').trim()
    if (userId) {
      setParams({ userId })
    } else {
      setParams({})
      applyClientFilter(allLoaded, values)
    }
  }

  function onReset() {
    form.resetFields()
    setParams({})
    setAllLoaded([])
    setRows([])
    setStats({ total: 0, filtered: 0 })
  }

  const columns: ColumnsType<Row> = [
    { title: '观演人 ID', dataIndex: 'id', key: 'id', width: 120, fixed: 'left' },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120 },
    {
      title: '身份证',
      dataIndex: 'idCardCipher',
      key: 'idCardCipher',
      width: 200,
      render: (v: string) => <span style={{ fontFamily: 'ui-monospace, monospace' }}>{maskIdCard(v)}</span>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (v: string) => <span style={{ fontFamily: 'ui-monospace, monospace' }}>{maskPhone(v)}</span>,
    },
    { title: '归属用户', dataIndex: 'userId', key: 'userId', width: 120 },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      render: (v: string) => <span style={{ color: '#64748b' }}>{v}</span>,
    },
  ]

  return (
    <PrdPanelHost pageKey="ViewersManage">
      <Card
        title={
          <Space>
            <span>观演人</span>
            <Tag color="blue">只读</Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              按 userId 过滤该用户的所有观演人
            </Typography.Text>
          </Space>
        }
        extra={
          <Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              共 {stats.total} / 筛选 {stats.filtered}
            </Typography.Text>
          </Space>
        }
      >
        <Form
          form={form}
          layout="inline"
          onFinish={onSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="userId" label="归属用户 ID">
            <Input placeholder="如 40001" allowClear style={{ width: 160 }} data-testid="vm-userid-input" />
          </Form.Item>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="姓名 / 手机号 / 身份证子串" allowClear style={{ width: 240 }} data-testid="vm-keyword-input" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" data-testid="vm-search-btn">查询</Button>
              <Button onClick={onReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        <Table<Row>
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 800 }}
          locale={{ emptyText: '暂无数据（请先在 userId 输入 40001 等查询）' }}
          data-testid="vm-table"
        />
      </Card>
    </PrdPanelHost>
  )
}
