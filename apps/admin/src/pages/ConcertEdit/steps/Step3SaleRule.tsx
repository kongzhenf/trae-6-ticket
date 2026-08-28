import { Col, DatePicker, Form, InputNumber, Row, Switch, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import type { ConcertDraft } from '@/stores/concertDraftStore'

const { Text } = Typography

export interface Step3SaleRuleProps {
  draft: ConcertDraft
  patch: (next: Partial<ConcertDraft>) => void
  errors?: Record<string, string>
}

export default function Step3SaleRule({ draft, patch, errors = {} }: Step3SaleRuleProps) {
  const saleStart: Dayjs | null = draft.saleStartTime ? dayjs(draft.saleStartTime) : null
  const saleEnd: Dayjs | null = draft.saleEndTime ? dayjs(draft.saleEndTime) : null
  const start: Dayjs | null = draft.startTime ? dayjs(draft.startTime) : null

  // saleStart < saleEnd < startTime 联合校验
  const saleOrderInvalid =
    (saleStart && saleEnd && !saleStart.isBefore(saleEnd)) ||
    (saleEnd && start && !saleEnd.isBefore(start))

  return (
    <Form layout="vertical" component="div">
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="开售时间"
            required
            validateStatus={errors.saleStartTime || saleOrderInvalid ? 'error' : undefined}
            help={errors.saleStartTime}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              value={saleStart}
              onChange={v => patch({ saleStartTime: v ? v.toISOString() : '' })}
              placeholder="开售开始"
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="停售时间"
            required
            validateStatus={errors.saleEndTime || saleOrderInvalid ? 'error' : undefined}
            help={
              saleOrderInvalid
                ? '停售时间必须晚于开售时间，且早于开演时间'
                : errors.saleEndTime
            }
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              value={saleEnd}
              onChange={v => patch({ saleEndTime: v ? v.toISOString() : '' })}
              placeholder="开售截止"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label="订单超时（分钟）" tooltip="用户下单后未支付自动取消时间">
            <InputNumber
              min={1}
              max={1440}
              step={1}
              style={{ width: '100%' }}
              value={draft.orderTimeoutMinutes}
              onChange={v => patch({ orderTimeoutMinutes: Number(v) || 15 })}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="单人限购数量" tooltip="单笔订单最多购买的票数（与票档限购取最小）">
            <InputNumber
              min={1}
              max={10}
              step={1}
              style={{ width: '100%' }}
              value={draft.maxBuyQuantity}
              onChange={v => patch({ maxBuyQuantity: Number(v) || 4 })}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="允许退票">
            <Switch
              checked={draft.refundEnabled}
              onChange={c => patch({ refundEnabled: c })}
              checkedChildren="允许"
              unCheckedChildren="禁止"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item label="是否显示库存" tooltip="关闭后 C 端只显示「有票 / 无票」">
            <Switch
              checked={draft.showStock}
              onChange={c => patch({ showStock: c })}
              checkedChildren="显示"
              unCheckedChildren="隐藏"
            />
          </Form.Item>
        </Col>
      </Row>

      <Text type="secondary" style={{ fontSize: 12 }}>
        开售区间约束：开售 ≤ 停售 ≤ 开演；如活动为「票档销售期」与活动整体不一致，M5 进入票档管理时可对单档调整。
      </Text>
    </Form>
  )
}
