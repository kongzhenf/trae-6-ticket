import { useState } from 'react'
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import type { ConcertDraft, DraftTicketItem } from '@/stores/concertDraftStore'
import { sumTotalStock } from '@/hooks/useConcertEdit'
import { formatMoney } from '@trae/shared'

const { Text } = Typography

export interface Step5TicketsProps {
  draft: ConcertDraft
  setTickets: (items: DraftTicketItem[]) => void
  errors?: Record<string, string>
}

interface ModalState {
  open: boolean
  editingKey?: string
  /** 草稿态（未保存） */
  temp: DraftTicketItem
}

const EMPTY_ITEM = (): DraftTicketItem => ({
  key: `tk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  categoryName: '',
  price: 0,
  totalStock: 0,
  maxBuyQuantity: 2,
  saleStartTime: '',
  saleEndTime: '',
  sort: 0,
  description: '',
})

export default function Step5Tickets({ draft, setTickets, errors = {} }: Step5TicketsProps) {
  const [modal, setModal] = useState<ModalState>({
    open: false,
    temp: EMPTY_ITEM(),
  })

  function openCreate() {
    // 默认使用活动级销售期
    const sst = draft.saleStartTime
    const set = draft.saleEndTime
    setModal({
      open: true,
      temp: { ...EMPTY_ITEM(), saleStartTime: sst, saleEndTime: set },
    })
  }

  function openEdit(item: DraftTicketItem) {
    setModal({ open: true, editingKey: item.key, temp: { ...item } })
  }

  function closeModal() {
    setModal({ open: false, temp: EMPTY_ITEM() })
  }

  function patchTemp(next: Partial<DraftTicketItem>) {
    setModal(prev => ({ ...prev, temp: { ...prev.temp, ...next } }))
  }

  function saveModal() {
    const t = modal.temp
    if (!t.categoryName.trim()) {
      Modal.error({ title: '请填写票档名称', content: '' })
      return
    }
    if (t.totalStock < 0 || t.price < 0) {
      Modal.error({ title: '价格与库存不能为负数', content: '' })
      return
    }
    const list = modal.editingKey
      ? draft.tickets.map(it => (it.key === modal.editingKey ? { ...t } : it))
      : [...draft.tickets, { ...t, sort: draft.tickets.length }]
    setTickets(list)
    closeModal()
  }

  function removeItem(key: string) {
    setTickets(draft.tickets.filter(it => it.key !== key))
  }

  const total = sumTotalStock(draft.tickets)

  const columns: ColumnsType<DraftTicketItem> = [
    { title: '排序', dataIndex: 'sort', width: 70, align: 'center' },
    {
      title: '票档名称',
      dataIndex: 'categoryName',
      render: (v: string) => <b>{v || <Text type="secondary">未命名</Text>}</b>,
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 130,
      align: 'right',
      render: (v: number) => formatMoney(Math.round((v ?? 0) * 100)),
    },
    { title: '总库存', dataIndex: 'totalStock', width: 100, align: 'right' },
    { title: '单人限购', dataIndex: 'maxBuyQuantity', width: 100, align: 'center' },
    {
      title: '销售期',
      width: 280,
      render: (_: unknown, row: DraftTicketItem) => {
        if (!row.saleStartTime || !row.saleEndTime) return <Text type="secondary">-</Text>
        return (
          <span style={{ fontSize: 12 }}>
            {dayjs(row.saleStartTime).format('YYYY-MM-DD HH:mm')}
            <br />~ {dayjs(row.saleEndTime).format('YYYY-MM-DD HH:mm')}
          </span>
        )
      },
    },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      render: (_: unknown, row: DraftTicketItem) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeItem(row.key)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Text type="secondary">
          至少 1 个票档；当前共 <b>{draft.tickets.length}</b> 个，总座位 <b>{total}</b>
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增票档
        </Button>
      </div>

      {errors.tickets && (
        <Alert type="error" showIcon message={errors.tickets} style={{ marginBottom: 12 }} />
      )}

      <Table
        rowKey="key"
        size="middle"
        dataSource={draft.tickets}
        columns={columns}
        pagination={false}
        scroll={{ x: 720 }}
        locale={{
          emptyText: (
            <Empty
              style={{ padding: 24 }}
              description="尚未配置票档，请点击「新增票档」"
            />
          ),
        }}
      />

      <Modal
        title={modal.editingKey ? '编辑票档' : '新增票档'}
        open={modal.open}
        onCancel={closeModal}
        onOk={saveModal}
        okText="保存"
        cancelText="取消"
        width={640}
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label="票档名称" required>
            <Input
              maxLength={100}
              placeholder="如：VIP 内场 / 内场 A 区 / 看台一等"
              value={modal.temp.categoryName}
              onChange={e => patchTemp({ categoryName: e.target.value })}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="价格（元）" required>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={1}
                precision={2}
                value={modal.temp.price}
                onChange={v => patchTemp({ price: Number(v) || 0 })}
                addonAfter="元"
              />
            </Form.Item>
            <Form.Item label="总库存" required>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={1}
                precision={0}
                value={modal.temp.totalStock}
                onChange={v => patchTemp({ totalStock: Number(v) || 0 })}
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
                value={modal.temp.maxBuyQuantity}
                onChange={v => patchTemp({ maxBuyQuantity: Number(v) || 1 })}
              />
            </Form.Item>
            <Form.Item label="排序">
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={1}
                value={modal.temp.sort}
                onChange={v => patchTemp({ sort: Number(v) || 0 })}
              />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="销售开始" required>
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                value={modal.temp.saleStartTime ? dayjs(modal.temp.saleStartTime) : null}
                onChange={(v: Dayjs | null) =>
                  patchTemp({ saleStartTime: v ? v.toISOString() : '' })
                }
              />
            </Form.Item>
            <Form.Item label="销售结束" required>
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                value={modal.temp.saleEndTime ? dayjs(modal.temp.saleEndTime) : null}
                onChange={(v: Dayjs | null) =>
                  patchTemp({ saleEndTime: v ? v.toISOString() : '' })
                }
              />
            </Form.Item>
          </div>
          <Form.Item label="说明">
            <Input.TextArea
              rows={2}
              maxLength={300}
              placeholder="如：最佳视角 / 含周边礼包 / 仅限会员购买"
              value={modal.temp.description}
              onChange={e => patchTemp({ description: e.target.value })}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
