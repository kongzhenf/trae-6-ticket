import { useEffect, useState } from 'react'
import { Drawer, Empty, Skeleton, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { StockAdjustment, TicketTier } from '@trae/shared'
import { formatDate } from '@trae/shared'

const { Text } = Typography

export interface StockLogDrawerProps {
  open: boolean
  ticket: TicketTier | null
  onClose: () => void
  loadLogs: (ticketId: string) => Promise<StockAdjustment[]>
}

export default function StockLogDrawer({
  open,
  ticket,
  onClose,
  loadLogs,
}: StockLogDrawerProps) {
  const [logs, setLogs] = useState<StockAdjustment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !ticket) return
    let cancelled = false
    setLoading(true)
    loadLogs(ticket.id)
      .then(rows => {
        if (!cancelled) setLogs(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, ticket, loadLogs])

  const columns: ColumnsType<StockAdjustment> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => formatDate(v),
    },
    {
      title: '调整量',
      dataIndex: 'delta',
      width: 100,
      align: 'right',
      render: (v: number) => (
        <Tag color={v > 0 ? 'green' : 'red'}>
          {v > 0 ? '+' : ''}{v}
        </Tag>
      ),
    },
    {
      title: '前 → 后',
      width: 160,
      render: (_: unknown, row: StockAdjustment) => (
        <span style={{ fontSize: 12 }}>
          {row.beforeAvailable} → <b>{row.afterAvailable}</b>
        </span>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operatorId',
      width: 110,
      render: (v: string) => <Text type="secondary">{v}</Text>,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      render: (v: string) => v,
    },
  ]

  return (
    <Drawer
      title={`库存调整记录：${ticket?.categoryName ?? ''}`}
      open={open}
      width={720}
      onClose={onClose}
      destroyOnHidden
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : logs.length === 0 ? (
        <Empty description="暂无库存调整记录" />
      ) : (
        <Table
          rowKey="id"
          size="middle"
          dataSource={logs}
          columns={columns}
          pagination={false}
        />
      )}
    </Drawer>
  )
}
