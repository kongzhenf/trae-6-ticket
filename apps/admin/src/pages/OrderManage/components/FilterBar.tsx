import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Col, DatePicker, Form, Input, Row, Select, Space } from 'antd'
import type { RangePickerProps } from 'antd/es/date-picker'
import { LinkOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import {
  ORDER_STATUS_LIST,
  ORDER_STATUS_META,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LIST,
  type AdminOrderQuery,
  type Concert,
  type PaymentStatus,
  type TicketTier,
} from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'
import { ADMIN_ROUTES } from '@trae/shared'

const { RangePicker } = DatePicker

type DayjsRange = NonNullable<RangePickerProps['value']>

export interface FilterValue extends Omit<AdminOrderQuery, 'createdAtRange' | 'paidAtRange'> {
  /** antd RangePicker 值；提交时由 index 转成 ISO */
  createdAtRange?: DayjsRange | null
  paidAtRange?: DayjsRange | null
}

interface Props {
  value: FilterValue
  onChange: (next: FilterValue) => void
  onSearch: () => void
  onReset: () => void
}

const DEFAULT_VALUE: FilterValue = {}

/**
 * 订单管理筛选条（H9）
 * - 10 项筛选：订单号 / 活动 / 票档 / 手机号 / 姓名 / 身份证 / 订单状态 / 支付状态 / 创建时间 / 支付时间
 * - 活动/票档用 antd Select 远端搜索 + 联动
 */
export default function FilterBar({ value, onChange, onSearch, onReset }: Props) {
  const [form] = Form.useForm<FilterValue>()
  const { adminEvent, adminTicket } = useApi()
  const navigate = useNavigate()

  // 活动远端搜索
  const [eventOptions, setEventOptions] = useState<Array<{ label: string; value: string }>>([])
  const [eventLoading, setEventLoading] = useState(false)
  // 票档（按选中活动联动）
  const [tierOptions, setTierOptions] = useState<Array<{ label: string; value: string }>>([])
  const [tierLoading, setTierLoading] = useState(false)

  // 初始化 form value
  useEffect(() => {
    form.setFieldsValue(value)
  }, [form, value])

  // 活动搜索
  async function searchEvents(keyword: string) {
    setEventLoading(true)
    try {
      const res = await adminEvent.listEvents({ keyword: keyword || undefined, pageSize: 50 })
      const list = (res.list ?? []) as Concert[]
      const opts = list.map(e => ({ label: e.eventName, value: e.id }))
      // 保留当前选中
      if (value.eventId && !opts.find(o => o.value === value.eventId)) {
        const cur = list.find(e => e.id === value.eventId)
        if (cur) opts.unshift({ label: cur.eventName, value: cur.id })
        else opts.unshift({ label: `${value.eventId}（已下架）`, value: value.eventId })
      }
      setEventOptions(opts)
    } catch (e) {
      console.error('[FilterBar] searchEvents failed', e)
      setEventOptions([])
    } finally {
      setEventLoading(false)
    }
  }

  // 票档联动
  useEffect(() => {
    let abort = false
    async function load() {
      if (!value.eventId) {
        setTierOptions([])
        return
      }
      setTierLoading(true)
      try {
        const list = (await adminTicket.listTickets(value.eventId)) as TicketTier[]
        if (abort) return
        setTierOptions(list.map(t => ({ label: t.categoryName, value: t.id })))
      } catch (e) {
        if (abort) return
        console.error('[FilterBar] load tickets failed', e)
        setTierOptions([])
      } finally {
        if (!abort) setTierLoading(false)
      }
    }
    void load()
    return () => {
      abort = true
    }
  }, [adminTicket, value.eventId])

  const orderStatusOptions = useMemo(
    () => ORDER_STATUS_LIST.map(k => ({ value: k, label: ORDER_STATUS_META[k].label })),
    [],
  )
  const paymentStatusOptions = useMemo(
    () => PAYMENT_STATUS_LIST.map(k => ({ value: k, label: PAYMENT_STATUS[k as PaymentStatus].label })),
    [],
  )

  function handleValuesChange(_changed: Partial<FilterValue>, all: FilterValue) {
    // 切换活动时清空票档
    if (all.eventId !== value.eventId) {
      onChange({ ...all, ticketTierId: undefined, eventId: all.eventId })
      form.setFieldValue('ticketTierId', undefined)
      return
    }
    onChange(all)
  }

  function handleSubmit() {
    onSearch()
  }

  function handleReset() {
    form.resetFields()
    onReset()
  }

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={DEFAULT_VALUE}
      onValuesChange={handleValuesChange}
      onFinish={handleSubmit}
    >
      <Row gutter={12}>
        <Col span={6}>
          <Form.Item name="orderNo" label="订单号">
            <Input placeholder="CON..." allowClear data-testid="om-filter-orderno" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="eventId" label="活动">
            <Select
              showSearch
              allowClear
              placeholder="输入关键字搜索活动"
              loading={eventLoading}
              filterOption={false}
              onSearch={searchEvents}
              onFocus={() => {
                if (eventOptions.length === 0) void searchEvents('')
              }}
              options={eventOptions}
              data-testid="om-filter-event"
              notFoundContent={eventLoading ? '搜索中…' : '暂无活动'}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="ticketTierId" label="票档">
            <Select
              allowClear
              placeholder={value.eventId ? '选择票档' : '请先选活动'}
              loading={tierLoading}
              disabled={!value.eventId}
              options={tierOptions}
              data-testid="om-filter-tier"
              notFoundContent={tierLoading ? '加载中…' : '暂无票档'}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="userMobile" label="联系手机号">
            <Input placeholder="精确匹配" allowClear data-testid="om-filter-mobile" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="viewerName" label="观演人姓名">
            <Input placeholder="模糊匹配" allowClear data-testid="om-filter-name" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="viewerIdCard" label="身份证号">
            <Input placeholder="精确匹配（脱敏前 18 位）" allowClear data-testid="om-filter-idcard" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="orderStatus" label="订单状态">
            <Select
              mode="multiple"
              allowClear
              placeholder="全部"
              options={orderStatusOptions}
              data-testid="om-filter-orderstatus"
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
              data-testid="om-filter-paystatus"
              maxTagCount="responsive"
            />
          </Form.Item>
        </Col>
        <Col span={9}>
          <Form.Item name="createdAtRange" label="创建时间">
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              data-testid="om-filter-created-range"
            />
          </Form.Item>
        </Col>
        <Col span={9}>
          <Form.Item name="paidAtRange" label="支付时间">
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              data-testid="om-filter-paid-range"
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label=" ">
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                data-testid="om-filter-search"
              >
                查询
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />} data-testid="om-filter-reset">
                重置
              </Button>
            </Space>
          </Form.Item>
        </Col>
      </Row>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 8 }}
        message={
          <Space size={8}>
            <span>提示：列表中的手机号与身份证号均已脱敏；完整信息请打开订单详情。</span>
            <Button
              size="small"
              type="link"
              icon={<LinkOutlined />}
              onClick={() => navigate(ADMIN_ROUTES.dashboard)}
              data-testid="om-filter-goto-dashboard"
            >
              回到数据看板
            </Button>
          </Space>
        }
      />
    </Form>
  )
}
