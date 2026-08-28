import { Button, Popconfirm, Space } from 'antd'
import type { Concert } from '@trae/shared'
import { useNavigate } from 'react-router-dom'
import { ADMIN_ROUTES } from '@trae/shared'

export interface EventActionBarProps {
  /** 当前行对应的演出（提供 id / status 用于判定可用操作） */
  event: Pick<Concert, 'id' | 'eventName' | 'status'>
  /** 是否正在对该行进行变更（按钮 loading） */
  loading?: boolean
  /** 是否禁用所有按钮（避免多行并发） */
  disabled?: boolean
  /** 状态机语义化操作 */
  onPublish?: (id: string) => void
  onOffline?: (id: string) => void
  onStopSale?: (id: string) => void
  onResumeSale?: (id: string) => void
  onRemove?: (id: string) => void
}

/**
 * 按 EVENT_TRANSITIONS 白名单（PRD §9.1）渲染操作按钮
 *
 * 设计要点：
 * - 危险操作（下架 / 暂停 / 删除 / 取消）使用 Popconfirm 二次确认
 * - 仅「finished / cancelled」显示「查看」一个只读链接
 * - 编辑始终可用（M4 实装后会跳到 /concerts/:id/edit；现阶段直接跳到占位页）
 */
export default function EventActionBar({
  event,
  loading = false,
  disabled = false,
  onPublish,
  onOffline,
  onStopSale,
  onResumeSale,
  onRemove,
}: EventActionBarProps) {
  const navigate = useNavigate()
  const { id, eventName, status } = event

  function gotoEdit() {
    navigate(ADMIN_ROUTES.concertEdit(id))
  }

  // 仅 finished / cancelled 显示「查看」
  const isTerminal = status === 'finished' || status === 'cancelled'

  const btn = (key: string, label: string, danger = false, onClick: () => void) => (
    <Button
      key={key}
      type="link"
      size="small"
      danger={danger}
      loading={loading}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {label}
    </Button>
  )

  // 通用 Popconfirm 包装
  const confirmBtn = (
    key: string,
    label: string,
    danger: boolean,
    onOk: () => void,
    title: string,
    okText: string,
    okButtonProps?: { danger?: boolean },
  ) => (
    <Popconfirm
      key={key}
      title={title}
      description={`活动「${eventName}」`}
      okText={okText}
      cancelText="取消"
      okButtonProps={okButtonProps ?? (danger ? { danger: true } : undefined)}
      onConfirm={onOk}
      disabled={disabled || loading}
    >
      <Button
        type="link"
        size="small"
        danger={danger}
        loading={loading}
        disabled={disabled || loading}
      >
        {label}
      </Button>
    </Popconfirm>
  )

  const items: React.ReactNode[] = []

  // 查看 / 编辑
  items.push(
    isTerminal
      ? btn('view', '查看', false, gotoEdit)
      : btn('edit', '编辑', false, gotoEdit),
  )

  switch (status) {
    case 'draft':
      items.push(btn('publish', '发布', false, () => onPublish?.(id)))
      items.push(
        confirmBtn(
          'remove',
          '删除',
          true,
          () => onRemove?.(id),
          '确认删除该草稿？',
          '确认删除',
        ),
      )
      break
    case 'pending':
      items.push(btn('publish', '发布', false, () => onPublish?.(id)))
      items.push(
        confirmBtn(
          'offline',
          '取消',
          true,
          () => onOffline?.(id),
          '确认取消该活动？',
          '确认取消',
        ),
      )
      break
    case 'published':
      items.push(btn('resume', '开始售票', false, () => onResumeSale?.(id)))
      items.push(
        confirmBtn(
          'offline',
          '下架',
          true,
          () => onOffline?.(id),
          '确认下架该活动？',
          '确认下架',
        ),
      )
      break
    case 'on_sale':
      items.push(
        confirmBtn(
          'stop',
          '暂停销售',
          false,
          () => onStopSale?.(id),
          '确认暂停销售？',
          '确认暂停',
        ),
      )
      items.push(
        confirmBtn(
          'offline',
          '下架',
          true,
          () => onOffline?.(id),
          '确认下架该活动？',
          '确认下架',
        ),
      )
      break
    case 'off_sale':
      items.push(btn('resume', '恢复销售', false, () => onResumeSale?.(id)))
      items.push(
        confirmBtn(
          'offline',
          '下架',
          true,
          () => onOffline?.(id),
          '确认下架该活动？',
          '确认下架',
        ),
      )
      break
    case 'stopped':
      items.push(btn('resume', '恢复销售', false, () => onResumeSale?.(id)))
      items.push(
        confirmBtn(
          'offline',
          '下架',
          true,
          () => onOffline?.(id),
          '确认下架该活动？',
          '确认下架',
        ),
      )
      break
    case 'sold_out':
      items.push(
        confirmBtn(
          'offline',
          '下架',
          true,
          () => onOffline?.(id),
          '确认下架该活动？',
          '确认下架',
        ),
      )
      break
    case 'offline':
      items.push(btn('publish', '重新发布', false, () => onPublish?.(id)))
      break
    case 'finished':
    case 'cancelled':
      // 仅查看
      break
  }

  return (
    <Space size={4} wrap>
      {items}
    </Space>
  )
}
