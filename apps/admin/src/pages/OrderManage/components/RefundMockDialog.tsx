import { useEffect, useState } from 'react'
import { Alert, Button, Form, Input, Modal, Space, Typography } from 'antd'
import { formatMoney, type OrderAdminView } from '@trae/shared'

const { Text } = Typography

const LS_KEY = 'concert_admin_refund_log'

interface LogEntry {
  orderId: string
  orderNo: string
  amount: number
  reason: string
  ts: number
}

interface Props {
  open: boolean
  order: OrderAdminView | null
  onClose: () => void
  onConfirmed?: () => void
}

interface FormValues {
  reason: string
}

/**
 * 退款 UI 占位弹窗（H9 B05）
 * - 本期不调用真实 refundOrder handler
 * - 设计留 hook：useRefundSubmit 内部 future-swap 到 adminOrderApi.refundOrder
 * - 退款原因 ≥ 4 字（与 mock 端 400026 校验一致）
 */
export default function RefundMockDialog({ open, order, onClose, onConfirmed }: Props) {
  const [form] = Form.useForm<FormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [recent, setRecent] = useState<LogEntry[]>([])

  useEffect(() => {
    if (open) {
      form.resetFields()
      try {
        const raw = localStorage.getItem(LS_KEY) ?? '[]'
        const arr = JSON.parse(raw) as LogEntry[]
        setRecent(arr.slice(-3).reverse())
      } catch {
        setRecent([])
      }
    }
  }, [form, open])

  /**
   * 设计留 hook：本期不调用真实 refund；O-6 之后可一行替换为：
   *   return submitRefundReal(order.id, reason)
   */
  async function submitRefund(orderIn: OrderAdminView, reason: string): Promise<{ ok: true; mocked: true }> {
    const raw = localStorage.getItem(LS_KEY) ?? '[]'
    const log: LogEntry[] = JSON.parse(raw)
    const entry: LogEntry = {
      orderId: orderIn.id,
      orderNo: orderIn.orderNo,
      amount: orderIn.payAmount,
      reason,
      ts: Date.now(),
    }
    log.push(entry)
    localStorage.setItem(LS_KEY, JSON.stringify(log))
    console.info('[admin refund mock]', orderIn.orderNo, reason)
    return { ok: true, mocked: true }
  }

  async function onOk() {
    if (!order) return
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      await submitRefund(order, values.reason.trim())
      onConfirmed?.()
      onClose()
    } catch {
      // antd Form validation 错误
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="申请退款"
      open={open}
      onCancel={onClose}
      destroyOnClose
      maskClosable={false}
      width={520}
      footer={
        <Space>
          <Button onClick={onClose} data-testid="om-refund-cancel">
            取消
          </Button>
          <Button
            type="primary"
            danger
            loading={submitting}
            onClick={onOk}
            data-testid="om-refund-confirm"
          >
            确认退款（演示）
          </Button>
        </Space>
      }
      data-testid="om-refund-modal"
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="本期退款为 UI 占位演示，未对接真实退款流；如需启用请联系开发。"
      />

      {order && (
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item label="订单号">
            <Text style={{ fontFamily: 'ui-monospace, monospace' }}>{order.orderNo}</Text>
          </Form.Item>
          <Form.Item label="退款金额">
            <Text strong style={{ color: '#dc2626' }}>
              {formatMoney(order.payAmount)}
            </Text>
            <Text type="secondary" style={{ marginLeft: 8 }}>
              原始订单金额
            </Text>
          </Form.Item>
          <Form.Item
            name="reason"
            label="退款原因"
            rules={[
              { required: true, message: '请输入退款原因' },
              { min: 4, message: '退款原因至少 4 个字' },
              { max: 200, message: '退款原因不超过 200 字' },
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={200}
              showCount
              placeholder="请描述退款原因（≥ 4 字）"
              data-testid="om-refund-reason"
            />
          </Form.Item>
        </Form>
      )}

      {recent.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            最近演示记录（仅本地保存）：
          </Text>
          <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 12, color: '#475569' }}>
            {recent.map((r) => (
              <li key={r.ts}>
                {r.orderNo} · {formatMoney(r.amount)} · {r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
