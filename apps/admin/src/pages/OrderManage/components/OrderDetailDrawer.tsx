import { Button, Card, Descriptions, Drawer, Space, Spin, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import {
  ADMIN_ROUTES,
  ORDER_STATUS_META,
  PAYMENT_STATUS,
  derivePaymentStatus,
  formatDate,
  formatMoney,
  maskIdCard,
  maskPhone,
  type Order,
  type OrderAdminView,
  type PaymentStatus,
  type Viewer,
} from '@trae/shared'

const { Text } = Typography

interface Props {
  open: boolean
  order: OrderAdminView | null
  loading?: boolean
  onClose: () => void
  onRefund?: (order: OrderAdminView) => void
}

/**
 * 订单详情 Drawer（H9 B05 完整版）
 * - 5 区块：基本信息 / 活动信息 / 票档明细 / 观演人 / 支付信息
 * - 列表层脱敏 → 详情仍展示完整 contactPhone / viewers（按 PRD §B05）
 */
export default function OrderDetailDrawer({ open, order, loading, onClose, onRefund }: Props) {
  const viewers = order?.viewers ?? []

  /**
   * S-2：观演人票号映射。
   * plan-order-viewers 语义：单票档 + viewers[]（length === quantity），
   * 即「第 i 张票」对应 viewers[i]。
   * seed 也按此规则生成；如遇历史不合法数据（长度不一致），按下限展示并标红。
   */
  const itemSummary = order?.items?.[0]?.categoryNameSnapshot ?? '—'
  const expectedQty = order?.items?.reduce((s, it) => s + (it.quantity ?? 0), 0) ?? 0
  const viewersLen = viewers.length
  const countMismatch = order != null && expectedQty !== viewersLen

  const viewerColumns: ColumnsType<Viewer> = [
    {
      title: '票号',
      key: 'ticketNo',
      width: 70,
      align: 'center',
      render: (_v, _r, i) => (
        <Tag color={i < expectedQty ? 'geekblue' : 'red'}>
          第 {i + 1} 张
        </Tag>
      ),
    },
    {
      title: '对应票档',
      key: 'tier',
      width: 130,
      render: () => <Text type="secondary">{itemSummary}</Text>,
    },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120 },
    {
      title: '身份证号',
      dataIndex: 'idCardCipher',
      key: 'idCardCipher',
      width: 220,
      render: (v: string) => (
        <Text style={{ fontFamily: 'ui-monospace, monospace' }}>{maskIdCard(v)}</Text>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 160,
      render: (v: string) => (
        <Text style={{ fontFamily: 'ui-monospace, monospace' }}>{maskPhone(v)}</Text>
      ),
    },
  ]

  const itemColumns: ColumnsType<NonNullable<Order['items']>[number]> = [
    { title: '票档', dataIndex: 'categoryNameSnapshot', key: 'name' },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 110,
      align: 'right',
      render: (v: number) => formatMoney(v),
    },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' },
    {
      title: '小计',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 110,
      align: 'right',
      render: (v: number) => <Text strong>{formatMoney(v)}</Text>,
    },
  ]

  const items = order?.items ?? []
  const ps: PaymentStatus | null = order
    ? derivePaymentStatus(order as Pick<Order, 'status' | 'paidAt' | 'refundedAt' | 'expireTime'>)
    : null

  const canRefund = order ? order.status === 'paid' || order.status === 'finished' : false
  const refundDisabledReason = order
    ? order.status === 'pending'
      ? '订单待支付，无需退款'
      : order.status === 'refunded' || order.status === 'cancelled'
        ? '订单已退款/已取消'
        : ''
    : ''

  return (
    <Drawer
      title={order ? `订单 ${order.orderNo}` : '订单详情'}
      open={open}
      onClose={onClose}
      width={720}
      destroyOnClose
      extra={
        order && (
          <Space>
            <Button onClick={onClose} data-testid="om-drawer-close">
              关闭
            </Button>
            {onRefund && (
              <Button
                danger
                disabled={!canRefund}
                onClick={() => canRefund && onRefund(order)}
                title={refundDisabledReason}
                data-testid="om-drawer-refund"
              >
                申请退款
              </Button>
            )}
          </Space>
        )
      }
      data-testid="om-detail-drawer"
    >
      {order ? (
        <Spin spinning={!!loading}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* 1. 基本信息 */}
          <Card size="small" title="基本信息" data-testid="om-drawer-base">
            <Descriptions column={2} size="small" colon={false}>
              <Descriptions.Item label="订单号">
                <Text style={{ fontFamily: 'ui-monospace, monospace' }} copyable>
                  {order.orderNo}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="用户 ID">{order.userId}</Descriptions.Item>
              <Descriptions.Item label="联系手机号">
                {order.contactPhone ? maskPhone(order.contactPhone) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="下单时间">{formatDate(order.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="订单状态">
                <Tag color={ORDER_STATUS_META[order.status].color}>
                  {ORDER_STATUS_META[order.status].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="支付状态">
                {ps ? <Tag color={PAYMENT_STATUS[ps].color}>{PAYMENT_STATUS[ps].label}</Tag> : '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 2. 活动信息 */}
          <Card size="small" title="活动信息" data-testid="om-drawer-event">
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label="活动名">
                <Link to={ADMIN_ROUTES.concertEdit(order.eventId)}>{order.eventName}</Link>
              </Descriptions.Item>
              <Descriptions.Item label="活动 ID">{order.eventId}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 3. 票档明细 */}
          <Card size="small" title="票档明细" data-testid="om-drawer-items">
            <Table
              size="small"
              rowKey="id"
              columns={itemColumns}
              dataSource={items}
              pagination={false}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <b>合计</b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} />
                  <Table.Summary.Cell index={2} align="right">
                    <b>{items.reduce((s, it) => s + (it.quantity ?? 0), 0)}</b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <b style={{ color: '#dc2626' }}>{formatMoney(order.totalAmount)}</b>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
            <Space style={{ marginTop: 8 }}>
              <Text type="secondary">折扣：{formatMoney(order.discountAmount)}</Text>
              <Text type="secondary">实付：</Text>
              <Text strong style={{ color: '#dc2626' }}>
                {formatMoney(order.payAmount)}
              </Text>
            </Space>
          </Card>

          {/* 4. 观演人 */}
          <Card
            size="small"
            title={
              <Space size={6} wrap>
                <span>观演人</span>
                <Tag color="blue">共 {viewersLen} 位</Tag>
                <Tag color="purple">{itemSummary} × {expectedQty}</Tag>
                {countMismatch && (
                  <Tag color="red" data-testid="om-viewer-mismatch">
                    数据不一致：票数 {expectedQty} ≠ 观演人 {viewersLen}
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                一票一观演人 · 身份证 / 手机号已脱敏
              </Text>
            }
            data-testid="om-drawer-viewers"
          >
            {viewers.length === 0 ? (
              <Typography.Text type="secondary">— 无观演人信息（旧数据兼容）</Typography.Text>
            ) : (
              <Table
                size="small"
                rowKey="id"
                columns={viewerColumns}
                dataSource={viewers}
                pagination={false}
              />
            )}
          </Card>

          {/* 5. 支付信息 */}
          <Card size="small" title="支付信息" data-testid="om-drawer-pay">
            <Descriptions column={2} size="small" colon={false}>
              <Descriptions.Item label="支付方式">{order.payMethod ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="支付时间">
                {order.paidAt ? formatDate(order.paidAt) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="取消时间">
                {order.cancelledAt ? formatDate(order.cancelledAt) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="退款时间">
                {order.refundedAt ? formatDate(order.refundedAt) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="过期时间">{formatDate(order.expireTime)}</Descriptions.Item>
              <Descriptions.Item label="入场码">
                {order.entryCode ? (
                  <Text style={{ fontFamily: 'ui-monospace, monospace' }} copyable>
                    {order.entryCode}
                  </Text>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Space>
        </Spin>
      ) : null}
    </Drawer>
  )
}
