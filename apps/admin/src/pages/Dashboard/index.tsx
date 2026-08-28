import { useMemo } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Result,
  Row,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, RiseOutlined } from '@ant-design/icons'
import type { DashboardOverview, DashboardTopConcert } from '@trae/shared'
import MetricCard from '@/components/MetricCard'
import PrdPanelHost from '@/components/PrdPanelHost'
import { useDashboard } from '@/hooks/useDashboard'
import { ADMIN_ROUTES } from '@trae/shared'

const { Title, Text } = Typography

type MetricKey =
  | 'totalEvents'
  | 'onSaleEvents'
  | 'totalOrders'
  | 'paidOrders'
  | 'totalTicketsSold'
  | 'totalSalesAmount'
  | 'todayOrders'
  | 'todaySalesAmount'

interface MetricMeta {
  key: MetricKey
  title: string
  suffix?: string
  isMoney?: boolean
  highlight?: boolean
  hint?: string
}

/**
 * 8 个指标卡（PRD B01）
 *  - 第一排：活动总数 / 销售中活动 / 订单总数 / 支付订单数
 *  - 第二排：售出票数 / 销售金额 / 今日订单 / 今日销售额
 */
const METRICS: MetricMeta[] = [
  { key: 'totalEvents', title: '活动总数', suffix: '场', highlight: true },
  {
    key: 'onSaleEvents',
    title: '销售中活动',
    suffix: '场',
    highlight: true,
    hint: 'status = on_sale',
  },
  { key: 'totalOrders', title: '订单总数', suffix: '单', highlight: true },
  {
    key: 'paidOrders',
    title: '支付订单数',
    suffix: '单',
    highlight: true,
    hint: 'status = paid',
  },
  { key: 'totalTicketsSold', title: '售出票数', suffix: '张' },
  { key: 'totalSalesAmount', title: '销售金额', isMoney: true },
  { key: 'todayOrders', title: '今日订单', suffix: '单' },
  { key: 'todaySalesAmount', title: '今日销售额', isMoney: true },
]

function MetricGrid({
  overview,
  loading,
}: {
  overview: DashboardOverview | null
  loading: boolean
}) {
  return (
    <Row gutter={[16, 16]}>
      {METRICS.map((m) => (
        <Col key={m.key} xs={24} sm={12} md={12} lg={6}>
          <MetricCard
            title={m.title}
            value={overview?.[m.key]}
            suffix={m.suffix}
            isMoney={m.isMoney}
            highlight={m.highlight}
            hint={m.hint}
            loading={loading}
          />
        </Col>
      ))}
    </Row>
  )
}

function PlaceholderCard({
  title,
  hint,
  height = 220,
}: {
  title: string
  hint: string
  height?: number
}) {
  return (
    <Card title={title} variant="outlined">
      <div
        style={{
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'repeating-linear-gradient(45deg, #f8fafc 0 8px, #f1f5f9 8px 16px)',
          borderRadius: 6,
          color: '#94a3b8',
        }}
      >
        <RiseOutlined style={{ fontSize: 24, marginBottom: 8 }} />
        <Text type="secondary">{hint}</Text>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { overview, topConcerts, loading, refreshing, error, reload } = useDashboard()
  const topList = topConcerts ?? []
  const { message } = App.useApp()

  const columns: ColumnsType<DashboardTopConcert> = useMemo(
    () => [
      {
        title: '排名',
        dataIndex: 'rank',
        width: 80,
        render: (_: unknown, __: DashboardTopConcert, idx: number) => {
          const rank = idx + 1
          const color =
            rank === 1
              ? '#facc15'
              : rank === 2
                ? '#cbd5e1'
                : rank === 3
                  ? '#fb923c'
                  : '#cbd5e1'
          return (
            <Tag
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: rank <= 3 ? color : '#64748b',
                fontWeight: rank <= 3 ? 600 : 400,
                fontSize: rank <= 3 ? 16 : 13,
              }}
            >
              #{rank}
            </Tag>
          )
        },
      },
      {
        title: '演出名称',
        dataIndex: 'eventName',
        ellipsis: true,
      },
      {
        title: '已售票数',
        dataIndex: 'ticketsSold',
        width: 140,
        align: 'right',
        sorter: (a, b) => a.ticketsSold - b.ticketsSold,
        render: (v: number) => `${v.toLocaleString()} 张`,
      },
      {
        title: '销售金额',
        dataIndex: 'salesAmount',
        width: 160,
        align: 'right',
        sorter: (a, b) => a.salesAmount - b.salesAmount,
        render: (cents: number) => `¥${(cents / 100).toFixed(2)}`,
      },
      {
        title: '操作',
        width: 100,
        align: 'center',
        render: (_: unknown, row: DashboardTopConcert) => (
          <Button
            type="link"
            size="small"
            onClick={() => message.info(`跳转查看演出：${row.eventName}`)}
          >
            详情
          </Button>
        ),
      },
    ],
    [message],
  )

  if (error && !overview) {
    return (
      <PrdPanelHost pageKey="Dashboard">
        <div className="admin-content">
          <Result
            status="error"
            title="数据加载失败"
            subTitle={error}
            extra={
              <Button type="primary" onClick={() => void reload()}>
                重试
              </Button>
            }
          />
        </div>
      </PrdPanelHost>
    )
  }

  return (
    <PrdPanelHost pageKey="Dashboard">
      <div className="admin-content">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title level={3} style={{ margin: 0 }}>
              运营数据概览
            </Title>
            <Text type="secondary">实时反映系统销售与库存情况</Text>
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
              onClick={() => {
                // 后续 M3 接入列表页：此处暂时仅提示
                message.success('即将跳转到演出列表')
                setTimeout(() => {
                  window.location.href = ADMIN_ROUTES.concertList
                }, 200)
              }}
            >
              进入演出管理
            </Button>
          </Space>
        </div>

        {/* 8 个指标卡 */}
        <MetricGrid overview={overview} loading={loading} />

        {/* 趋势 + 分布占位 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={16}>
            <PlaceholderCard
              title="销售趋势（最近 30 天）"
              hint="后续阶段接入图表库（M7+）"
            />
          </Col>
          <Col xs={24} lg={8}>
            <PlaceholderCard
              title="订单状态分布"
              hint="待支付 / 已支付 / 已退款 / 已取消"
            />
          </Col>
        </Row>

        {/* TOP 10 演出 */}
        <Card
          title="热门演出 TOP 10"
          variant="outlined"
          style={{ marginTop: 16 }}
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              按已售票数降序
            </Text>
          }
          styles={{ body: { padding: 0 } }}
        >
          {loading ? (
            <div style={{ padding: 24 }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : topList.length === 0 ? (
            <Empty
              style={{ padding: 32 }}
              description="暂无演出销售数据，请先在【演出管理】中创建并发布演出"
            />
          ) : (
            <Table
              rowKey="concertId"
              size="middle"
              columns={columns}
              dataSource={topList}
              pagination={false}
            />
          )}
        </Card>

        {/* 底部实时动态（占位） */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <PlaceholderCard
              title="最新订单流水"
              hint="首期占位 · 后续接入 Order 模块"
              height={180}
            />
          </Col>
          <Col xs={24} md={12}>
            <PlaceholderCard
              title="最新注册用户"
              hint="首期占位 · 后续接入 User 模块"
              height={180}
            />
          </Col>
        </Row>
      </div>
    </PrdPanelHost>
  )
}
