import { useEffect, useState } from 'react'
import {
  Alert,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Typography,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import type { TicketTier } from '@trae/shared'

const { Text } = Typography

export interface TicketEditModalProps {
  open: boolean
  /** 编辑时传入被编辑票档；新建时为 null */
  ticket: TicketTier | null
  /** 当前活动销售期（用于填默认值） */
  defaultSaleStart: string
  defaultSaleEnd: string
  /** 当前活动级限购 */
  defaultMaxBuyQuantity: number
  onCancel: () => void
  onSubmit: (payload: TicketEditPayload) => Promise<{ ok: boolean; message?: string }>
}

export interface TicketEditPayload {
  categoryName: string
  /** 元 */
  price: number
  totalStock: number
  maxBuyQuantity: number
  saleStartTime: string
  saleEndTime: string
  sort: number
  description?: string
}

interface FormState extends Omit<TicketEditPayload, 'saleStartTime' | 'saleEndTime'> {
  saleStartTime: Dayjs | null
  saleEndTime: Dayjs | null
}

const EMPTY = (
  defaultSaleStart: string,
  defaultSaleEnd: string,
  defaultMaxBuyQuantity: number,
): FormState => ({
  categoryName: '',
  price: 0,
  totalStock: 0,
  maxBuyQuantity: defaultMaxBuyQuantity,
  saleStartTime: defaultSaleStart ? dayjs(defaultSaleStart) : null,
  saleEndTime: defaultSaleEnd ? dayjs(defaultSaleEnd) : null,
  sort: 0,
  description: '',
})

export default function TicketEditModal({
  open,
  ticket,
  defaultSaleStart,
  defaultSaleEnd,
  defaultMaxBuyQuantity,
  onCancel,
  onSubmit,
}: TicketEditModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    EMPTY(defaultSaleStart, defaultSaleEnd, defaultMaxBuyQuantity),
  )
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (ticket) {
      setForm({
        categoryName: ticket.categoryName,
        price: ticket.price / 100, // 后端存分，前端展示元
        totalStock: ticket.totalStock,
        maxBuyQuantity: ticket.maxBuyQuantity,
        saleStartTime: ticket.saleStartTime ? dayjs(ticket.saleStartTime) : null,
        saleEndTime: ticket.saleEndTime ? dayjs(ticket.saleEndTime) : null,
        sort: ticket.sort,
        description: ticket.description ?? '',
      })
    } else {
      setForm(EMPTY(defaultSaleStart, defaultSaleEnd, defaultMaxBuyQuantity))
    }
    setErr(null)
  }, [open, ticket, defaultSaleStart, defaultSaleEnd, defaultMaxBuyQuantity])

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleOk() {
    setErr(null)
    if (!form.categoryName.trim()) {
      setErr('请填写票档名称')
      return
    }
    if (form.price < 0) {
      setErr('价格不能为负数')
      return
    }
    if (form.totalStock < 0) {
      setErr('总库存不能为负数')
      return
    }
    if (form.maxBuyQuantity < 1 || form.maxBuyQuantity > 10) {
      setErr('单人限购必须在 1-10 之间')
      return
    }
    if (!form.saleStartTime || !form.saleEndTime) {
      setErr('请填写销售起止时间')
      return
    }
    if (!form.saleStartTime.isBefore(form.saleEndTime)) {
      setErr('销售开始必须早于销售结束')
      return
    }
    setSubmitting(true)
    const payload: TicketEditPayload = {
      categoryName: form.categoryName.trim(),
      price: Math.round(form.price * 100), // 元 → 分
      totalStock: form.totalStock,
      maxBuyQuantity: form.maxBuyQuantity,
      saleStartTime: form.saleStartTime.toISOString(),
      saleEndTime: form.saleEndTime.toISOString(),
      sort: form.sort,
      description: form.description?.trim() || undefined,
    }
    const r = await onSubmit(payload)
    setSubmitting(false)
    if (!r.ok) {
      setErr(r.message ?? '保存失败')
    }
  }

  return (
    <Modal
      title={ticket ? `编辑票档 #${ticket.id}` : '新增票档'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
      width={640}
    >
      {err && (
        <Alert type="error" showIcon title={err} style={{ marginBottom: 12 }} />
      )}
      <Form layout="vertical" component="div">
        <Form.Item label="票档名称" required>
          <Input
            maxLength={100}
            placeholder="如：VIP 内场 / 内场 A 区 / 看台一等"
            value={form.categoryName}
            onChange={e => patch('categoryName', e.target.value)}
          />
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item label="价格（元）" required>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={1}
              precision={2}
              value={form.price}
              onChange={v => patch('price', Number(v) || 0)}
              addonAfter="元"
            />
          </Form.Item>
          <Form.Item label="总库存" required>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={1}
              precision={0}
              value={form.totalStock}
              onChange={v => patch('totalStock', Number(v) || 0)}
            />
          </Form.Item>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item label="单人限购" required>
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={10}
              step={1}
              value={form.maxBuyQuantity}
              onChange={v => patch('maxBuyQuantity', Number(v) || 1)}
            />
          </Form.Item>
          <Form.Item label="排序">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={1}
              value={form.sort}
              onChange={v => patch('sort', Number(v) || 0)}
            />
          </Form.Item>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item label="销售开始" required>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              value={form.saleStartTime}
              onChange={v => patch('saleStartTime', v)}
            />
          </Form.Item>
          <Form.Item label="销售结束" required>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              value={form.saleEndTime}
              onChange={v => patch('saleEndTime', v)}
            />
          </Form.Item>
        </div>
        <Form.Item label="说明">
          <Input.TextArea
            rows={2}
            maxLength={300}
            placeholder="如：最佳视角 / 含周边礼包 / 仅限会员购买"
            value={form.description}
            onChange={e => patch('description', e.target.value)}
          />
        </Form.Item>
        <Text type="secondary" style={{ fontSize: 12 }}>
          PRD §31 第 1 条：价格与销售统计字段以服务端为准；后端会自动为可售/锁定/已售字段填默认值。
        </Text>
      </Form>
    </Modal>
  )
}
