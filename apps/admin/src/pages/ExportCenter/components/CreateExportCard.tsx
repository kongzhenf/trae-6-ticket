import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Col, DatePicker, Form, Row, Select, Space, Typography } from 'antd'
import type { RangePickerProps } from 'antd/es/date-picker'
import {
  ORDER_STATUS_LIST,
  ORDER_STATUS_META,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LIST,
  type Concert,
  type CreateExportPayload,
  type OrderStatus,
  type PaymentStatus,
} from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'

const { RangePicker } = DatePicker
const { Text } = Typography

type DayjsRange = NonNullable<RangePickerProps['value']>

export interface CreateFormValues {
  eventId?: string
  orderStatus?: OrderStatus[]
  paymentStatus?: PaymentStatus[]
  createdAtRange?: DayjsRange | null
}

interface Props {
  onCreated: () => void
}

/**
 * 创建导出卡片（H10 B10）
 * - 演出：远端搜索单选 Select
 * - 订单状态 / 支付状态：多选（空 = 全部）
 * - 时间区间：创建时间 RangePicker（必填）
 * - 「导出」按钮提交任务
 */
export default function CreateExportCard({ onCreated }: Props) {
  const { adminEvent, adminExport } = useApi()
  const [form] = Form.useForm<CreateFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const mountedRef = useRef(true)

  const [eventOptions, setEventOptions] = useState<Array<{ label: string; value: string }>>([])
  const [eventLoading, setEventLoading] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function searchEvents(keyword: string) {
    setEventLoading(true)
    try {
      const res = await adminEvent.listEvents({ keyword: keyword || undefined, pageSize: 50 })
      if (!mountedRef.current) return
      const list = (res.list ?? []) as Concert[]
      setEventOptions(list.map(e => ({ label: e.eventName, value: e.id })))
    } catch (e) {
      console.error('[CreateExportCard] searchEvents failed', e)
      if (mountedRef.current) setEventOptions([])
    } finally {
      if (mountedRef.current) setEventLoading(false)
    }
  }

  useEffect(() => {
    void searchEvents('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const orderStatusOptions = useMemo(
    () => ORDER_STATUS_LIST.map(k => ({ value: k, label: ORDER_STATUS_META[k].label })),
    [],
  )
  const paymentStatusOptions = useMemo(
    () => PAYMENT_STATUS_LIST.map(k => ({ value: k, label: PAYMENT_STATUS[k].label })),
    [],
  )

  async function onSubmit() {
    try {
      const values = await form.validateFields()
      const range = values.createdAtRange
      if (!range || !Array.isArray(range) || !range[0] || !range[1]) return
      const payload: CreateExportPayload = {
        type: 'order',
        eventId: values.eventId!,
        orderStatuses: values.orderStatus ?? [],
        paymentStatuses: values.paymentStatus ?? [],
        filter: {
          eventId: values.eventId!,
          orderStatus: values.orderStatus,
          paymentStatus: values.paymentStatus,
          createdAtRange: [
            range[0].toDate().toISOString().replace('T', ' ').slice(0, 19),
            range[1].toDate().toISOString().replace('T', ' ').slice(0, 19),
          ],
        },
      }
      setSubmitting(true)
      await adminExport.createTask(payload)
      form.resetFields(['orderStatus', 'paymentStatus', 'createdAtRange'])
      onCreated()
    } catch (e) {
      // 表单校验失败或网络错误
      console.error('[CreateExportCard] submit failed', e)
    } finally {
      setSubmitting(false)
    }
  }

  function onReset() {
    form.resetFields()
  }

  return (
    <Card
      title={
        <Space>
          <span>创建导出</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            订单列表 → 异步生成 Excel
          </Text>
        </Space>
      }
      data-testid="export-create-card"
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="导出内容包含订单与观演人完整实名信息（手机号 / 身份证号），属于内部数据，请勿外发。"
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ orderStatus: [], paymentStatus: [] }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="eventId"
              label="演出名称"
              rules={[{ required: true, message: '请先选择一个演出' }]}
            >
              <Select
                showSearch
                placeholder="输入关键字搜索演出（仅支持选择一场）"
                loading={eventLoading}
                filterOption={false}
                onSearch={searchEvents}
                options={eventOptions}
                data-testid="export-event-select"
                notFoundContent={eventLoading ? '搜索中…' : '暂无活动'}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="orderStatus" label="订单状态">
              <Select
                mode="multiple"
                allowClear
                placeholder="全部"
                options={orderStatusOptions}
                data-testid="export-orderstatus"
                maxTagCount="responsive"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="paymentStatus" label="支付状态">
              <Select
                mode="multiple"
                allowClear
                placeholder="全部"
                options={paymentStatusOptions}
                data-testid="export-paystatus"
                maxTagCount="responsive"
              />
            </Form.Item>
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <Form.Item label=" ">
              <Space>
                <Button onClick={onReset} data-testid="export-reset">
                  重置
                </Button>
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={onSubmit}
                  data-testid="export-submit"
                >
                  导出
                </Button>
              </Space>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="createdAtRange"
              label="创建时间"
              rules={[{ required: true, message: '请选择创建时间区间' }]}
            >
              <RangePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                data-testid="export-range"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  )
}
