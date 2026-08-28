import type { ConcertStatus } from '@trae/shared'

/**
 * H5 端 react-vant Tag 适配
 * - color 是 antd/Tag 的语义色集合，react-vant 的 `type` 包含 primary / success / warning / danger
 * - 默认 'default' 在 react-vant 中表现为 plain 白底灰字
 */
export interface ConcertStatusMeta {
  label: string
  tagType?: 'primary' | 'success' | 'warning' | 'danger' | 'default'
  tagColor?: string
}

const META: Record<ConcertStatus, ConcertStatusMeta> = {
  draft: { label: '草稿', tagType: 'default' },
  pending: { label: '即将开售', tagType: 'primary' },
  published: { label: '已发布', tagType: 'primary' },
  on_sale: { label: '售票中', tagType: 'success' },
  off_sale: { label: '已停售', tagType: 'warning' },
  offline: { label: '已下架', tagType: 'default' },
  stopped: { label: '已暂停', tagType: 'warning' },
  sold_out: { label: '已售罄', tagType: 'danger' },
  finished: { label: '已结束', tagType: 'default' },
  cancelled: { label: '已取消', tagType: 'default' },
}

export function concertStatusMeta(status: ConcertStatus): ConcertStatusMeta {
  return (
    META[status] ?? {
      label: `未知（${String(status)}）`,
      tagType: 'default',
    }
  )
}
