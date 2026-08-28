import { useEffect, useState } from 'react'
import {
  Alert,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Space,
  Tag,
  Typography,
} from 'antd'
import type { TicketTier } from '@trae/shared'

const { Text } = Typography

export interface StockAdjustModalProps {
  open: boolean
  ticket: TicketTier | null
  onCancel: () => void
  onSubmit: (delta: number, reason: string) => Promise<{ ok: boolean; message?: string }>
}

type Direction = 'inc' | 'dec'

const REASON_MIN = 4

export default function StockAdjustModal({
  open,
  ticket,
  onCancel,
  onSubmit,
}: StockAdjustModalProps) {
  const [direction, setDirection] = useState<Direction>('inc')
  const [amount, setAmount] = useState<number>(10)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDirection('inc')
    setAmount(10)
    setReason('')
    setErr(null)
  }, [open, ticket])

  if (!ticket) return null

  const delta = direction === 'inc' ? amount : -amount
  const afterPreview = ticket.availableStock + delta
  const exceedsZero = afterPreview < 0
  const reasonInvalid = reason.trim().length < REASON_MIN

  async function handleOk() {
    setErr(null)
    if (reasonInvalid) {
      setErr(`调整原因不少于 ${REASON_MIN} 字`)
      return
    }
    if (amount <= 0) {
      setErr('调整量必须 > 0')
      return
    }
    if (exceedsZero) {
      setErr('调整后可用库存不能小于 0')
      return
    }
    setSubmitting(true)
    const r = await onSubmit(delta, reason.trim())
    setSubmitting(false)
    if (!r.ok) {
      setErr(r.message ?? '调库失败')
    }
  }

  return (
    <Modal
      title={`调整库存：${ticket.categoryName}`}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="确认调整"
      cancelText="取消"
      destroyOnHidden
      width={520}
    >
      {err && <Alert type="error" showIcon title={err} style={{ marginBottom: 12 }} />}

      <div style={{ marginBottom: 16, color: '#475569' }}>
        <Space size={12} wrap>
          <span>
            当前可售：
            <b style={{ color: '#0f172a' }}>{ticket.availableStock}</b> 张
          </span>
          <span>
            总 / 锁定 / 已售：
            <Tag>{ticket.totalStock}</Tag>
            <Tag color="orange">{ticket.lockedStock}</Tag>
            <Tag color="green">{ticket.soldStock}</Tag>
          </span>
        </Space>
      </div>

      <Form layout="vertical" component="div">
        <Form.Item label="调整方向" required>
          <Radio.Group
            value={direction}
            onChange={e => setDirection(e.target.value as Direction)}
          >
            <Radio.Button value="inc">+ 增加</Radio.Button>
            <Radio.Button value="dec">- 减少</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="调整数量（张）" required>
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            step={1}
            precision={0}
            value={amount}
            onChange={v => setAmount(Number(v) || 0)}
          />
        </Form.Item>

        <Form.Item
          label={
            <Space>
              <span>调整原因</span>
              <Text type="secondary" style={{ fontSize: 12 }}>
                （不少于 {REASON_MIN} 字，PRD §8 库存调整审计要求）
              </Text>
            </Space>
          }
          required
          validateStatus={reasonInvalid && reason.length > 0 ? 'error' : undefined}
          help={reasonInvalid && reason.length > 0 ? `不少于 ${REASON_MIN} 字` : undefined}
        >
          <Input.TextArea
            rows={3}
            maxLength={200}
            showCount
            placeholder="如：临时加开座位 / 系统出错补回 / 场地扩容"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </Form.Item>

        <div
          style={{
            background: '#f8fafc',
            padding: '8px 12px',
            borderRadius: 6,
            color: '#334155',
            fontSize: 13,
          }}
        >
          预览：<b>{delta > 0 ? '+' : ''}{delta}</b> 张，调整后可用库存 ={' '}
          <b style={{ color: exceedsZero ? '#dc2626' : '#16a34a' }}>{afterPreview}</b> 张
          {exceedsZero && '（将变负，已阻止）'}
        </div>
      </Form>
    </Modal>
  )
}
