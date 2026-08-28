import { useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Empty,
  Skeleton,
  Space,
  Table,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { Concert } from '@trae/shared'
import { ADMIN_ROUTES, formatDate, errorCodeMessage } from '@trae/shared'
import PrdPanelHost from '@/components/PrdPanelHost'
import EventStatusTag from '@/components/EventStatusTag'
import EventActionBar from '@/components/EventActionBar'
import EventFilterBar from '@/components/EventFilterBar'
import { useEvents } from '@/hooks/useEvents'
import { useApi } from '@/contexts/ApiContext'

const { Title, Text } = Typography

export default function ConcertList() {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const { adminTicket } = useApi()
  const {
    list,
    total,
    page,
    pageSize,
    filter,
    loading,
    refreshing,
    actionLoadingId,
    error,
    setFilter,
    resetFilter,
    setPage,
    setPageSize,
    reload,
    publish,
    offline,
    stopSale,
    resumeSale,
    remove,
  } = useEvents(10)

  /** 票档聚合：M5 接入后端聚合接口时改为单接口一次拉完 */
  const [tierStats, setTierStats] = useState<Record<string, { count: number; seats: number }>>({})

  useEffect(() => {
    let cancelled = false
    if (list.length === 0) {
      setTierStats({})
      return () => {
        cancelled = true
      }
    }
    ;(async () => {
      const stats: Record<string, { count: number; seats: number }> = {}
      for (const ev of list) {
        try {
          const tiers = await adminTicket.listTickets(ev.id)
          stats[ev.id] = {
            count: tiers.length,
            seats: tiers.reduce((s, t) => s + t.totalStock, 0),
          }
        } catch {
          stats[ev.id] = { count: 0, seats: 0 }
        }
      }
      if (!cancelled) setTierStats(stats)
    })()
    return () => {
      cancelled = true
    }
  }, [list, adminTicket])

  /** 统一变更后的反馈处理 */
  async function handleAction(
    promise: Promise<{ ok: boolean; message?: string; code?: number | string }>,
    successText: string,
  ) {
    const r = await promise
    if (r.ok) {
      message.success(r.message || successText)
    } else if (typeof r.code === 'number') {
      message.error(errorCodeMessage(r.code, r.message))
    } else {
      message.error(r.message || successText.replace('成功', '失败'))
    }
  }

  /** 删除动作需要弹 confirm（行内 Popconfirm 之外再弹一次 Modal 兜底） */
  function confirmRemove(id: string, eventName: string) {
    modal.confirm({
      title: '确认删除该草稿？',
      content: (
        <span>
          将永久删除活动「<b>{eventName}</b>」，且无法恢复。是否继续？
        </span>
      ),
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const r = await remove(id)
        if (r.ok) message.success(r.message || '删除成功')
        else if (typeof r.code === 'number')
          message.error(errorCodeMessage(r.code, r.message))
        else message.error(r.message || '删除失败')
      },
    })
  }

  const columns: ColumnsType<Concert> = useMemo(
    () => [
      {
        title: '演出名称',
        dataIndex: 'eventName',
        width: 280,
        render: (_: unknown, row: Concert) => (
          <div>
            <div className="font-medium text-slate-800">{row.eventName}</div>
            {row.subtitle && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {row.subtitle}
              </Text>
            )}
          </div>
        ),
      },
      {
        title: '开演时间',
        dataIndex: 'startTime',
        width: 200,
        render: (_: unknown, row: Concert) => (
          <div>
            <div>{formatDate(row.startTime)}</div>
            {row.endTime && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                至 {formatDate(row.endTime, 'HH:mm')}
              </Text>
            )}
          </div>
        ),
      },
      {
        title: '场馆',
        dataIndex: 'venueName',
        width: 200,
        ellipsis: true,
        render: (v: string, row: Concert) => (
          <Tooltip title={row.venueAddress ?? v}>
            <span>{v || '-'}</span>
          </Tooltip>
        ),
      },
      {
        title: '开售时间',
        dataIndex: 'saleStartTime',
        width: 160,
        render: (v: string) => formatDate(v),
      },
      {
        title: '票档',
        dataIndex: 'id',
        width: 120,
        render: (_: unknown, row: Concert) => {
          const s = tierStats[row.id]
          if (!s) return <Text type="secondary">-</Text>
          return (
            <span>
              <b>{s.count}</b> 档
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {s.seats.toLocaleString()} 座
              </Text>
            </span>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        render: (s: Concert['status']) => <EventStatusTag status={s} />,
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        width: 170,
        render: (v: string) => (
          <Tooltip title={v}>
            <span>{formatDate(v)}</span>
          </Tooltip>
        ),
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 240,
        fixed: 'right',
        render: (_: unknown, row: Concert) => (
          <EventActionBar
            event={row}
            loading={actionLoadingId === row.id}
            disabled={!!actionLoadingId && actionLoadingId !== row.id}
            onPublish={id => handleAction(publish(id), '发布')}
            onOffline={id => handleAction(offline(id), '下架')}
            onStopSale={id => handleAction(stopSale(id), '暂停销售')}
            onResumeSale={id => handleAction(resumeSale(id), '恢复销售')}
            onRemove={id => confirmRemove(id, row.eventName)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actionLoadingId, tierStats, publish, offline, stopSale, resumeSale, remove, message, modal],
  )

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize,
    total,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: [10, 20, 50],
    showTotal: t => `共 ${t} 条`,
  }

  return (
    <PrdPanelHost pageKey="ConcertList">
      <div className="admin-content">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title level={3} style={{ margin: 0 }}>
              演出管理
            </Title>
            <Text type="secondary">查询、筛选、状态变更、删除草稿</Text>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined spin={refreshing} />}
              onClick={() => void reload()}
              loading={refreshing}
              disabled={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate(ADMIN_ROUTES.concertEdit('new'))}
            >
              新建演出
            </Button>
          </Space>
        </div>

        <Card variant="outlined" style={{ marginBottom: 16 }}>
          <EventFilterBar
            value={filter}
            onChange={setFilter}
            onReset={resetFilter}
            loading={loading || refreshing}
          />
        </Card>

        <Card variant="outlined" styles={{ body: { padding: 0 } }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              <Skeleton active paragraph={{ rows: 8 }} />
            </div>
          ) : error ? (
            <Empty
              style={{ padding: 48 }}
              description={
                <span>
                  <div className="text-slate-700 mb-2">数据加载失败</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {error}
                  </Text>
                </span>
              }
            >
              <Button type="primary" onClick={() => void reload()}>
                重试
              </Button>
            </Empty>
          ) : (
            <Table
              rowKey="id"
              size="middle"
              columns={columns}
              dataSource={list}
              scroll={{ x: 1280 }}
              pagination={pagination}
              onChange={p => {
                if (p.current && p.current !== page) setPage(p.current)
                if (p.pageSize && p.pageSize !== pageSize) setPageSize(p.pageSize)
              }}
              locale={{
                emptyText: (
                  <Empty
                    style={{ padding: 32 }}
                    description={
                      filter.keyword || filter.status || filter.startTimeRange
                        ? '没有符合条件的演出，试试调整筛选条件'
                        : '暂无演出，先点击右上角「新建演出」创建第一场吧'
                    }
                  />
                ),
              }}
            />
          )}
        </Card>
      </div>
    </PrdPanelHost>
  )
}
