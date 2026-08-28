import { useCallback, useState } from 'react'
import { App as AntdApp, Card, Space, Typography } from 'antd'
import type { TablePaginationConfig } from 'antd/es/table'
import { errorCodeMessage, type AdminOrderQuery, type OrderAdminView } from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'
import PrdPanelHost from '@/components/PrdPanelHost'
import FilterBar, { type FilterValue } from './components/FilterBar'
import OrderTable from './components/OrderTable'
import OrderDetailDrawer from './components/OrderDetailDrawer'
import RefundMockDialog from './components/RefundMockDialog'
import { useOrderList } from './hooks/useOrderList'

const { Title } = Typography

/**
 * 订单管理 H9 B05 完整版
 * - 10 项筛选 + 10 列 + 详情 Drawer + 退款 UI 占位
 * - 状态机：订单状态 vs 支付状态 双轴
 */
export default function OrderManage() {
  const { adminOrder } = useApi()
  const { message } = AntdApp.useApp()
  const { list, total, loading, query, setQuery, refresh, reset } = useOrderList()

  // 表单控件值（与 antd Form 双向绑定）
  const [filter, setFilter] = useState<FilterValue>({ page: 1, pageSize: 20 })
  // 详情 Drawer
  const [detail, setDetail] = useState<OrderAdminView | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  // 退款弹窗
  const [refundTarget, setRefundTarget] = useState<OrderAdminView | null>(null)

  /** 把 FilterValue 转成 AdminOrderQuery，提交查询 */
  const handleSearch = useCallback(() => {
    const next: AdminOrderQuery = {
      page: 1,
      pageSize: query.pageSize ?? 20,
      orderNo: filter.orderNo?.trim() || undefined,
      eventId: filter.eventId || undefined,
      ticketTierId: filter.ticketTierId || undefined,
      userMobile: filter.userMobile?.trim() || undefined,
      viewerName: filter.viewerName?.trim() || undefined,
      viewerIdCard: filter.viewerIdCard?.trim() || undefined,
      orderStatus: filter.orderStatus,
      paymentStatus: filter.paymentStatus,
    }
    if (filter.createdAtRange && Array.isArray(filter.createdAtRange) && filter.createdAtRange[0] && filter.createdAtRange[1]) {
      const [s, e] = filter.createdAtRange
      next.createdAtRange = [s.toISOString().replace('T', ' ').slice(0, 19), e.toISOString().replace('T', ' ').slice(0, 19)]
    }
    if (filter.paidAtRange && Array.isArray(filter.paidAtRange) && filter.paidAtRange[0] && filter.paidAtRange[1]) {
      const [s, e] = filter.paidAtRange
      next.paidAtRange = [s.toISOString().replace('T', ' ').slice(0, 19), e.toISOString().replace('T', ' ').slice(0, 19)]
    }
    setQuery(next)
  }, [filter, query.pageSize, setQuery])

  const handleReset = useCallback(() => {
    setFilter({ page: 1, pageSize: 20 })
    reset()
  }, [reset])

  const handleTableChange = useCallback(
    (p: TablePaginationConfig) => {
      setQuery({
        ...query,
        page: p.current ?? query.page ?? 1,
        pageSize: p.pageSize ?? query.pageSize ?? 20,
      })
    },
    [query, setQuery],
  )

  const openDetail = useCallback(
    async (row: OrderAdminView) => {
      setDetail(row) // 乐观打开
      setDetailLoading(true)
      try {
        const fresh = await adminOrder.getOrderDetail(row.id)
        setDetail(fresh)
      } catch (e) {
        const er = e as { code?: number; message?: string }
        const msg = er.message || (typeof er.code === 'number' ? errorCodeMessage(er.code) : '') || '订单详情加载失败，已展示列表快照'
        message.warning(msg)
      } finally {
        setDetailLoading(false)
      }
    },
    [adminOrder, message],
  )

  const openRefund = useCallback((row: OrderAdminView) => {
    setRefundTarget(row)
  }, [])

  const onRefundConfirmed = useCallback(() => {
    message.success('已记录退款申请（演示）')
    void refresh()
  }, [message, refresh])

  return (
    <PrdPanelHost pageKey="OrderManage">
      <div className="admin-content" data-testid="order-manage-root">
        <Title level={3}>订单管理</Title>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card data-testid="om-filter-card">
            <FilterBar
              value={filter}
              onChange={setFilter}
              onSearch={handleSearch}
              onReset={handleReset}
            />
          </Card>

          <Card>
            <OrderTable
              data={list}
              loading={loading}
              total={total}
              page={query.page ?? 1}
              pageSize={query.pageSize ?? 20}
              onChange={handleTableChange}
              onRowClick={openDetail}
              onRefund={openRefund}
            />
          </Card>
        </Space>

        <OrderDetailDrawer
          open={!!detail}
          order={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
          onRefund={openRefund}
        />

        <RefundMockDialog
          open={!!refundTarget}
          order={refundTarget}
          onClose={() => setRefundTarget(null)}
          onConfirmed={onRefundConfirmed}
        />
      </div>
    </PrdPanelHost>
  )
}
