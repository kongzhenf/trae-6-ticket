import { useState } from 'react'
import {
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Result,
  Skeleton,
  Space,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  HistoryOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import type { TicketTier } from '@trae/shared'
import { ADMIN_ROUTES, errorCodeMessage } from '@trae/shared'
import PrdPanelHost from '@/components/PrdPanelHost'
import EventStatusTag from '@/components/EventStatusTag'
import TicketTable from './components/TicketTable'
import TicketEditModal, {
  type TicketEditPayload,
} from './components/TicketEditModal'
import StockAdjustModal from './components/StockAdjustModal'
import StockLogDrawer from './components/StockLogDrawer'
import { useTicketManage } from '@/hooks/useTicketManage'

const { Title, Text } = Typography

export default function TicketManage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const eventId = id
  const { message } = App.useApp()

  const {
    event,
    tickets,
    actionLoadingId,
    loading,
    refreshing,
    error,
    reload,
    loadStockAdjustments,
    create,
    update,
    enable,
    disable,
    adjustStock,
  } = useTicketManage(eventId)

  // Modal 状态
  const [editOpen, setEditOpen] = useState(false)
  const [editingTicket, setEditingTicket] = useState<TicketTier | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustingTicket, setAdjustingTicket] = useState<TicketTier | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [logTicket, setLogTicket] = useState<TicketTier | null>(null)

  function openCreate() {
    setEditingTicket(null)
    setEditOpen(true)
  }

  function openEdit(t: TicketTier) {
    setEditingTicket(t)
    setEditOpen(true)
  }

  function openAdjust(t: TicketTier) {
    setAdjustingTicket(t)
    setAdjustOpen(true)
  }

  function openLogs(t: TicketTier) {
    setLogTicket(t)
    setLogOpen(true)
  }

  async function handleSubmitEdit(payload: TicketEditPayload) {
    if (!eventId) return { ok: false, message: '活动 id 缺失' }
    if (editingTicket) {
      const r = await update(editingTicket.id, payload)
      if (r.ok) {
        message.success(r.message ?? '保存成功')
        setEditOpen(false)
      } else if (typeof r.code === 'number') {
        message.error(errorCodeMessage(r.code, r.message))
      } else {
        message.error(r.message ?? '保存失败')
      }
      return r
    } else {
      const createPayload = {
        categoryName: payload.categoryName,
        price: payload.price,
        totalStock: payload.totalStock,
        maxBuyQuantity: payload.maxBuyQuantity,
        saleStartTime: payload.saleStartTime,
        saleEndTime: payload.saleEndTime,
        sort: payload.sort,
        description: payload.description,
      } as Parameters<typeof create>[0]
      const r = await create(createPayload)
      if (r.ok) {
        message.success(r.message ?? '新增成功')
        setEditOpen(false)
      } else if (typeof r.code === 'number') {
        message.error(errorCodeMessage(r.code, r.message))
      } else {
        message.error(r.message ?? '新增失败')
      }
      return r
    }
  }

  async function handleAdjust(delta: number, reason: string) {
    if (!adjustingTicket) return { ok: false, message: '未选择票档' }
    const r = await adjustStock(adjustingTicket.id, delta, reason)
    if (r.ok) {
      message.success(r.message ?? '调库成功')
      setAdjustOpen(false)
    } else if (typeof r.code === 'number') {
      message.error(errorCodeMessage(r.code, r.message))
    } else {
      message.error(r.message ?? '调库失败')
    }
    return r
  }

  async function handleEnable(t: TicketTier) {
    const r = await enable(t.id)
    if (r.ok) message.success(r.message ?? '已启用')
    else if (typeof r.code === 'number') message.error(errorCodeMessage(r.code, r.message))
    else message.error(r.message ?? '启用失败')
  }

  async function handleDisable(t: TicketTier) {
    const r = await disable(t.id)
    if (r.ok) message.success(r.message ?? '已停售')
    else if (typeof r.code === 'number') message.error(errorCodeMessage(r.code, r.message))
    else message.error(r.message ?? '停售失败')
  }

  if (loading) {
    return (
      <PrdPanelHost pageKey="TicketManage">
        <div className="admin-content">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      </PrdPanelHost>
    )
  }

  if (error && !event) {
    return (
      <PrdPanelHost pageKey="TicketManage">
        <div className="admin-content">
          <Result
            status="error"
            title="加载失败"
            subTitle={error}
            extra={
              <Space>
                <Button onClick={() => navigate(ADMIN_ROUTES.concertList)}>返回列表</Button>
              </Space>
            }
          />
        </div>
      </PrdPanelHost>
    )
  }

  if (!event) {
    return (
      <PrdPanelHost pageKey="TicketManage">
        <div className="admin-content">
          <Empty description="未找到活动" />
        </div>
      </PrdPanelHost>
    )
  }

  return (
    <PrdPanelHost pageKey="TicketManage">
      <div className="admin-content">
        {/* 顶部条 */}
        <div className="flex items-center justify-between mb-4">
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(ADMIN_ROUTES.concertList)}
            >
              返回列表
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              票档管理 · {event.eventName}
            </Title>
            <EventStatusTag status={event.status} />
          </Space>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={() => void reload()}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
            >
              新增票档
            </Button>
          </Space>
        </div>

        {/* 活动基本信息只读卡 */}
        <Card title="活动信息" size="small" style={{ marginBottom: 16 }}>
          <Descriptions size="small" column={3} bordered>
            <Descriptions.Item label="活动名称" span={3}>
              {event.eventName}
            </Descriptions.Item>
            <Descriptions.Item label="开演时间" span={3}>
              {dayjs(event.startTime).format('YYYY-MM-DD HH:mm')}
              {event.endTime && `  ~  ${dayjs(event.endTime).format('YYYY-MM-DD HH:mm')}`}
            </Descriptions.Item>
            <Descriptions.Item label="场馆">{event.venueName}</Descriptions.Item>
            <Descriptions.Item label="地址">{event.venueAddress ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <EventStatusTag status={event.status} />
            </Descriptions.Item>
            <Descriptions.Item label="开售时间" span={3}>
              {event.saleStartTime ? `${dayjs(event.saleStartTime).format('YYYY-MM-DD HH:mm')}  ~  ${dayjs(event.saleEndTime).format('YYYY-MM-DD HH:mm')}` : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 票档工具条 */}
        <div className="flex items-center justify-between mb-2">
          <Text type="secondary">
            共 <b>{tickets.length}</b> 个票档 ·
            总座位 <b>{tickets.reduce((s, t) => s + t.totalStock, 0)}</b> ·
            可售 <b>{tickets.reduce((s, t) => s + t.availableStock, 0)}</b>
          </Text>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => {
              if (tickets.length === 0) {
                message.info('暂无票档可查看日志')
                return
              }
              openLogs(tickets[0])
            }}
          >
            查看调整记录
          </Button>
        </div>

        {/* 票档表 */}
        <Card variant="outlined" styles={{ body: { padding: 0 } }}>
          <TicketTable
            tickets={tickets}
            loading={loading}
            actionLoadingId={actionLoadingId}
            onEdit={openEdit}
            onAdjustStock={openAdjust}
            onEnable={handleEnable}
            onDisable={handleDisable}
          />
        </Card>

        {/* 编辑 / 调库 / 日志 */}
        <TicketEditModal
          open={editOpen}
          ticket={editingTicket}
          defaultSaleStart={event.saleStartTime}
          defaultSaleEnd={event.saleEndTime}
          defaultMaxBuyQuantity={event.maxBuyQuantity}
          onCancel={() => setEditOpen(false)}
          onSubmit={handleSubmitEdit}
        />

        <StockAdjustModal
          open={adjustOpen}
          ticket={adjustingTicket}
          onCancel={() => setAdjustOpen(false)}
          onSubmit={handleAdjust}
        />

        <StockLogDrawer
          open={logOpen}
          ticket={logTicket}
          onClose={() => setLogOpen(false)}
          loadLogs={loadStockAdjustments}
        />
      </div>
    </PrdPanelHost>
  )
}
