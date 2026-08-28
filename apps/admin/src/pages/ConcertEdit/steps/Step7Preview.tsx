import { Alert, Card, Col, Descriptions, Empty, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { formatMoney } from '@trae/shared'
import type { ConcertDraft, DraftTicketItem } from '@/stores/concertDraftStore'
import { sumTotalStock } from '@/hooks/useConcertEdit'

const { Title, Text, Paragraph } = Typography

export interface Step7PreviewProps {
  draft: ConcertDraft
  buyerFields: { name: boolean; idCard: boolean; mobile: true }
}

export default function Step7Preview({ draft, buyerFields }: Step7PreviewProps) {
  const total = sumTotalStock(draft.tickets)

  const ticketColumns: ColumnsType<DraftTicketItem> = [
    { title: '排序', dataIndex: 'sort', width: 70, align: 'center' },
    { title: '票档名称', dataIndex: 'categoryName' },
    {
      title: '价格',
      dataIndex: 'price',
      width: 130,
      align: 'right',
      render: v => formatMoney(Math.round((v ?? 0) * 100)),
    },
    { title: '总库存', dataIndex: 'totalStock', width: 100, align: 'right' },
    {
      title: '销售期',
      render: (_: unknown, row: DraftTicketItem) => {
        if (!row.saleStartTime || !row.saleEndTime) return '-'
        return (
          <span style={{ fontSize: 12 }}>
            {dayjs(row.saleStartTime).format('YYYY-MM-DD HH:mm')}
            <br />~ {dayjs(row.saleEndTime).format('YYYY-MM-DD HH:mm')}
          </span>
        )
      },
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        发布预览
      </Title>
      <Text type="secondary">以下汇总为即将保存的演出信息，请确认无误后点击底部「发布」。</Text>

      <div className="mt-4 space-y-4">
        <Card title="基本信息" size="small">
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="演出名称" span={2}>
              {draft.eventName || <Text type="secondary">未填写</Text>}
            </Descriptions.Item>
            {draft.subtitle && (
              <Descriptions.Item label="副标题" span={2}>
                {draft.subtitle}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="开演时间" span={2}>
              {draft.startTime ? dayjs(draft.startTime).format('YYYY-MM-DD HH:mm') : <Text type="secondary">未填写</Text>}
            </Descriptions.Item>
            {draft.endTime && (
              <Descriptions.Item label="结束时间" span={2}>
                {dayjs(draft.endTime).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="场馆">
              {draft.venueName || <Text type="secondary">未填写</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="地址">
              {draft.venueAddress || <Text type="secondary">未填写</Text>}
            </Descriptions.Item>
            {(draft.longitude !== undefined || draft.latitude !== undefined) && (
              <Descriptions.Item label="经纬度" span={2}>
                {draft.longitude ?? '-'}, {draft.latitude ?? '-'}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card title="销售规则" size="small">
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="开售时间" span={2}>
              {draft.saleStartTime
                ? `${dayjs(draft.saleStartTime).format('YYYY-MM-DD HH:mm')}  ~  ${dayjs(draft.saleEndTime).format('YYYY-MM-DD HH:mm')}`
                : <Text type="secondary">未填写</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="订单超时">{draft.orderTimeoutMinutes} 分钟</Descriptions.Item>
            <Descriptions.Item label="单人限购">{draft.maxBuyQuantity} 张</Descriptions.Item>
            <Descriptions.Item label="允许退票">
              <Tag color={draft.refundEnabled ? 'green' : 'default'}>
                {draft.refundEnabled ? '允许' : '禁止'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="显示库存">
              <Tag color={draft.showStock ? 'green' : 'default'}>
                {draft.showStock ? '显示' : '隐藏'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="购票字段" size="small">
          <Space>
            <Tag color={buyerFields.name ? 'green' : 'default'}>姓名 {buyerFields.name ? '必填' : '选填'}</Tag>
            <Tag color={buyerFields.idCard ? 'green' : 'default'}>
              身份证 {buyerFields.idCard ? '必填' : '选填'}
            </Tag>
            <Tag color="green">手机号 必填</Tag>
          </Space>
        </Card>

        <Card title={`票档（${draft.tickets.length}）`} size="small">
          {draft.tickets.length === 0 ? (
            <Empty description="尚未配置票档，请返回 Step 5 配置" />
          ) : (
            <>
              <Table
                size="small"
                rowKey="key"
                dataSource={draft.tickets}
                columns={ticketColumns}
                pagination={false}
                scroll={{ x: 640 }}
              />
              <Paragraph type="secondary" style={{ marginTop: 8 }}>
                共 <b>{draft.tickets.length}</b> 个票档，总座位 <b>{total}</b>
              </Paragraph>
            </>
          )}
        </Card>

        <Card title="活动详情" size="small">
          <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
            {draft.detailContent || <Text type="secondary">（未填写）</Text>}
          </Paragraph>
        </Card>

        <Card title="购票须知" size="small">
          <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
            {draft.noticeContent || <Text type="secondary">（未填写）</Text>}
          </Paragraph>
        </Card>

        <Row>
          <Col span={24}>
            <Alert
              type="info"
              showIcon
              title="点击底部「发布」即把当前状态推到 published；之后可在「演出列表」点「开始售票」推到 on_sale。"
            />
          </Col>
        </Row>
      </div>
    </div>
  )
}
