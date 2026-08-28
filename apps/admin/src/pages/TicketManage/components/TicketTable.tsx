import { Button, Empty, Popconfirm, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, StockOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { TicketTier } from '@trae/shared'
import { formatMoney } from '@trae/shared'
import TicketStatusTag from '@/components/TicketStatusTag'

const { Text } = Typography

export interface TicketTableProps {
  tickets: TicketTier[]
  loading: boolean
  /** 当前正在变更的票档 id（loading 用） */
  actionLoadingId: string | null
  onEdit: (ticket: TicketTier) => void
  onAdjustStock: (ticket: TicketTier) => void
  onEnable: (ticket: TicketTier) => void
  onDisable: (ticket: TicketTier) => void
}

export default function TicketTable({
  tickets,
  loading,
  actionLoadingId,
  onEdit,
  onAdjustStock,
  onEnable,
  onDisable,
}: TicketTableProps) {
  const columns: ColumnsType<TicketTier> = [
    { title: '排序', dataIndex: 'sort', width: 70, align: 'center' },
    {
      title: '票档名称',
      dataIndex: 'categoryName',
      width: 160,
      render: (v: string) => <b>{v || <Text type="secondary">未命名</Text>}</b>,
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 130,
      align: 'right',
      render: v => formatMoney(Number(v) || 0),
    },
    {
      title: '总 / 可售 / 锁定 / 已售',
      width: 200,
      render: (_: unknown, row: TicketTier) => (
        <Space size={4} wrap>
          <span>{row.totalStock}</span>
          <Text type="secondary">/</Text>
          <b style={{ color: row.availableStock <= 0 ? '#dc2626' : undefined }}>
            {row.availableStock}
          </b>
          <Text type="secondary">/</Text>
          <span>{row.lockedStock}</span>
          <Text type="secondary">/</Text>
          <span>{row.soldStock}</span>
        </Space>
      ),
    },
    {
      title: '限购',
      dataIndex: 'maxBuyQuantity',
      width: 80,
      align: 'center',
    },
    {
      title: '销售期',
      width: 260,
      render: (_: unknown, row: TicketTier) => {
        if (!row.saleStartTime || !row.saleEndTime) return <Text type="secondary">-</Text>
        return (
          <span style={{ fontSize: 12 }}>
            {dayjs(row.saleStartTime).format('YYYY-MM-DD HH:mm')}
            <br />~ {dayjs(row.saleEndTime).format('YYYY-MM-DD HH:mm')}
          </span>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: s => <TicketStatusTag status={s} />,
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 220,
      fixed: 'right',
      render: (_: unknown, row: TicketTier) => {
        const busy = actionLoadingId === row.id
        const disabled = !!actionLoadingId && actionLoadingId !== row.id
        const items: React.ReactNode[] = []
        items.push(
          <Button
            key="edit"
            type="link"
            size="small"
            icon={<EditOutlined />}
            loading={busy}
            disabled={disabled}
            onClick={() => onEdit(row)}
          >
            编辑
          </Button>,
        )
        items.push(
          <Button
            key="stock"
            type="link"
            size="small"
            icon={<StockOutlined />}
            loading={busy}
            disabled={disabled}
            onClick={() => onAdjustStock(row)}
          >
            调库
          </Button>,
        )
        if (row.status === 'stopped' || row.status === 'sold_out') {
          items.push(
            <Button
              key="enable"
              type="link"
              size="small"
              loading={busy}
              disabled={disabled}
              onClick={() => onEnable(row)}
            >
              启用
            </Button>,
          )
        } else if (row.status === 'available') {
          items.push(
            <Popconfirm
              key="disable"
              title="确认停售？"
              description={`停售后「${row.categoryName}」将不再售卖`}
              okText="确认停售"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDisable(row)}
              disabled={disabled}
            >
              <Button type="link" size="small" danger loading={busy} disabled={disabled}>
                停售
              </Button>
            </Popconfirm>,
          )
        }
        return <Space size={4}>{items}</Space>
      },
    },
  ]

  return (
    <Table
      rowKey="id"
      size="middle"
      loading={loading}
      dataSource={tickets}
      columns={columns}
      pagination={false}
      scroll={{ x: 1100 }}
      locale={{
        emptyText: (
          <Empty
            style={{ padding: 32 }}
            description="尚未配置票档，点击右上角「新增票档」"
          />
        ),
      }}
    />
  )
}
