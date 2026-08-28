import { useCallback, useState } from 'react'
import { App as AntdApp, Button, Card, Space, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import {
  ADMIN_ROUTES,
  EXPORT_STATUS,
  ORDER_STATUS_META,
  PAYMENT_STATUS,
  errorCodeMessage,
  formatDate,
  type ExportTask,
  type OrderStatus,
  type PaymentStatus,
} from '@trae/shared'
import { useApi } from '@/contexts/ApiContext'

const { Text } = Typography

interface Props {
  data: ExportTask[]
  loading: boolean
  total: number
  page: number
  pageSize: number
  onChange: (p: TablePaginationConfig) => void
  onRefresh: () => void
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * 导出任务列表（H10 B10）
 * - 10 列：任务编号 / 导出类型 / 演出名称 / 订单数量 / 订单状态 / 支付状态 / 创建人 / 创建时间 / 状态 / 下载
 * - 自动接收「processing 自动轮询」由 useExportTaskList 提供
 * - 点击「下载」→ 浏览器下载真实 xls 文件
 */
export default function TaskListTable({
  data,
  loading,
  total,
  page,
  pageSize,
  onChange,
  onRefresh,
}: Props) {
  const { adminExport } = useApi()
  const { message } = AntdApp.useApp()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const onDownload = useCallback(
    async (row: ExportTask) => {
      if (row.status !== 'completed') return
      setDownloadingId(row.id)
      try {
        const res = await adminExport.downloadTask(row.id)
        const blob = base64ToBlob(res.base64, res.mime)
        triggerDownload(blob, res.filename)
        message.success(`已下载 ${res.filename}`)
      } catch (e) {
        const er = e as { code?: number; message?: string }
        const msg = er.message || (typeof er.code === 'number' ? errorCodeMessage(er.code) : '') || '下载失败'
        message.error(msg)
      } finally {
        setDownloadingId(null)
      }
    },
    [adminExport, message],
  )

  const columns: ColumnsType<ExportTask> = [
    {
      title: '任务编号',
      dataIndex: 'taskNo',
      key: 'taskNo',
      width: 160,
      fixed: 'left',
      render: (v: string) => (
        <Text style={{ fontFamily: 'ui-monospace, monospace' }} copyable>
          {v}
        </Text>
      ),
    },
    {
      title: '导出类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v: ExportTask['type']) => <Tag color="blue">{v.toUpperCase()}</Tag>,
    },
    {
      title: '演出名称',
      dataIndex: 'eventName',
      key: 'eventName',
      width: 220,
      ellipsis: true,
      render: (v: string, r) => (
        <Link to={ADMIN_ROUTES.concertEdit(r.eventId)} onClick={e => e.stopPropagation()}>
          {v}
        </Link>
      ),
    },
    {
      title: '订单数量',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      align: 'right',
      render: (v: number, r) => (
        <Text strong={r.status === 'completed'}>{v.toLocaleString('zh-CN')}</Text>
      ),
    },
    {
      title: '订单状态',
      key: 'orderStatuses',
      width: 200,
      render: (_v, r) =>
        r.orderStatuses.length === 0 ? (
          <Tag>全部</Tag>
        ) : (
          <Space size={4} wrap>
            {r.orderStatuses.map(s => (
              <Tag key={s} color={ORDER_STATUS_META[s as OrderStatus].color}>
                {ORDER_STATUS_META[s as OrderStatus].label}
              </Tag>
            ))}
          </Space>
        ),
    },
    {
      title: '支付状态',
      key: 'paymentStatuses',
      width: 200,
      render: (_v, r) =>
        r.paymentStatuses.length === 0 ? (
          <Tag>全部</Tag>
        ) : (
          <Space size={4} wrap>
            {r.paymentStatuses.map(p => (
              <Tag key={p} color={PAYMENT_STATUS[p as PaymentStatus].color}>
                {PAYMENT_STATUS[p as PaymentStatus].label}
              </Tag>
            ))}
          </Space>
        ),
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 110,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => formatDate(v),
    },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_v, r) => {
        const meta = EXPORT_STATUS[r.status]
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '下载',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_v, r) => {
        const canDownload = r.status === 'completed'
        const isDownloading = downloadingId === r.id
        const disabledReason =
          r.status === 'processing'
            ? '任务生成中，请稍候'
            : r.status === 'failed'
              ? '任务失败，无法下载'
              : r.status === 'expired'
                ? '下载链接已过期'
                : ''
        const btn = (
          <Button
            type="primary"
            size="small"
            icon={<DownloadOutlined />}
            loading={isDownloading}
            disabled={!canDownload}
            onClick={(e) => {
              e.stopPropagation()
              if (canDownload) void onDownload(r)
            }}
            data-testid={`export-download-${r.id}`}
          >
            下载
          </Button>
        )
        return canDownload ? btn : <Tooltip title={disabledReason}>{btn}</Tooltip>
      },
    },
  ]

  return (
    <Card
      title={
        <Space>
          <span>导出任务列表</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            共 {total.toLocaleString('zh-CN')} 条 · 链接有效期 7 天
          </Text>
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          data-testid="export-refresh"
        >
          刷新
        </Button>
      }
      data-testid="export-tasklist-card"
    >
      <Table<ExportTask>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 1400 }}
        onChange={onChange}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: t => `共 ${t} 条`,
        }}
        locale={{ emptyText: '暂无导出任务，请先在「创建导出」中提交' }}
        data-testid="export-table"
      />
    </Card>
  )
}
