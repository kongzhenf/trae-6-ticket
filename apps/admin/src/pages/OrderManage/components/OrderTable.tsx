import { Button, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import {
  ADMIN_ROUTES,
  ORDER_STATUS_META,
  PAYMENT_STATUS,
  derivePaymentStatus,
  formatDate,
  formatMoney,
  maskPhone,
  type Order,
  type OrderAdminView,
  type PaymentStatus,
} from '@trae/shared'
import { Link } from 'react-router-dom'

const { Text } = Typography

interface Props {
  data: OrderAdminView[]
  loading: boolean
  total: number
  page: number
  pageSize: number
  onChange: (pagination: TablePaginationConfig) => void
  onRowClick: (row: OrderAdminView) => void
  onRefund: (row: OrderAdminView) => void
}

/**
 * 订单管理表格（H9 B05）
 * - 10 列 + 操作列
 * - 列表层手机号/身份证脱敏
 * - 「退款」按钮按状态条件启用
 */
export default function OrderTable({
  data,
  loading,
  total,
  page,
  pageSize,
  onChange,
  onRowClick,
  onRefund,
}: Props) {
  const columns: ColumnsType<OrderAdminView> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 200,
      fixed: 'left',
      render: (v: string, r) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, fontFamily: 'ui-monospace, monospace' }}
          onClick={(e) => {
            e.stopPropagation()
            onRowClick(r)
          }}
          data-testid={`om-row-orderno-${r.id}`}
        >
          {v}
        </Button>
      ),
    },
    {
      title: '活动',
      dataIndex: 'eventName',
      key: 'eventName',
      width: 200,
      ellipsis: true,
      render: (v: string, r) => (
        <Link to={ADMIN_ROUTES.concertEdit(r.eventId)} onClick={(e) => e.stopPropagation()}>
          {v}
        </Link>
      ),
    },
    {
      title: '用户手机',
      key: 'userMobile',
      width: 130,
      render: (_v, r) => maskPhone(r.userMobile || r.viewers?.[0]?.phone),
    },
    {
      title: (
        <Space size={4}>
          <span>票档</span>
          <Tooltip title="单订单只允许一个票档，每张票对应一位观演人">
            <InfoCircleOutlined style={{ color: '#94a3b8' }} />
          </Tooltip>
        </Space>
      ),
      key: 'ticketTierSummary',
      width: 200,
      ellipsis: true,
      render: (_v, r) => <Text>{r.ticketTierSummary}</Text>,
    },
    {
      title: '数量',
      key: 'quantity',
      width: 70,
      align: 'right',
      render: (_v, r) => (r.items ?? []).reduce((s, it) => s + (it.quantity ?? 0), 0),
    },
    {
      title: '金额',
      dataIndex: 'payAmount',
      key: 'payAmount',
      width: 110,
      align: 'right',
      render: (v: number) => <Text strong>{formatMoney(v)}</Text>,
    },
    {
      title: '支付状态',
      key: 'paymentStatus',
      width: 100,
      render: (_v, r) => {
        const ps: PaymentStatus = derivePaymentStatus(r as Pick<Order, 'status' | 'paidAt' | 'refundedAt' | 'expireTime'>)
        const meta = PAYMENT_STATUS[ps]
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: Order['status']) => {
        const meta = ORDER_STATUS_META[s]
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => formatDate(v),
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      key: 'paidAt',
      width: 160,
      render: (v?: string) => (v ? formatDate(v) : '—'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_v, r) => {
        const canRefund = r.status === 'paid' || r.status === 'finished'
        const disabled = !canRefund
        const tooltip = canRefund
          ? ''
          : r.status === 'pending'
            ? '订单待支付，无需退款'
            : '订单已退款/已取消'
        const btn = (
          <Button
            type="link"
            size="small"
            danger
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              if (canRefund) onRefund(r)
            }}
            data-testid={`om-row-refund-${r.id}`}
          >
            退款
          </Button>
        )
        return (
          <Space size={0}>
            <Button
              type="link"
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onRowClick(r)
              }}
              data-testid={`om-row-detail-${r.id}`}
            >
              详情
            </Button>
            {disabled ? <Tooltip title={tooltip}>{btn}</Tooltip> : btn}
          </Space>
        )
      },
    },
  ]

  return (
    <Table<OrderAdminView>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 1400 }}
      onRow={(r) => ({ onClick: () => onRowClick(r) })}
      onChange={onChange}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: [10, 20, 50, 100],
        showTotal: (t) => `共 ${t} 条`,
      }}
      locale={{ emptyText: '暂无订单' }}
      data-testid="om-table"
    />
  )
}
