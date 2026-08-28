import type { ConcertStatus } from '../types/concert'

/** PRD §9.1 演出状态机：label + antd Tag color */
export const EVENT_STATUS: Record<ConcertStatus, { label: string; color: string }> = {
  draft:     { label: '草稿',     color: 'default' },
  pending:   { label: '待开售',   color: 'cyan'    },
  published: { label: '已发布',   color: 'blue'    },
  on_sale:   { label: '售票中',   color: 'green'   },
  off_sale:  { label: '已停售',   color: 'orange'  },
  offline:   { label: '已下架',   color: 'red'     },
  stopped:   { label: '已暂停',   color: 'gold'    },
  sold_out:  { label: '已售罄',   color: 'magenta' },
  finished:  { label: '已结束',   color: 'gray'    },
  cancelled: { label: '已取消',   color: 'red'     },
}

export const EVENT_STATUS_LIST: ConcertStatus[] = [
  'draft',
  'pending',
  'published',
  'on_sale',
  'off_sale',
  'offline',
  'stopped',
  'sold_out',
  'finished',
  'cancelled',
]

/** PRD §9.1 状态转移白名单：每个状态允许跳到的下一个状态集合 */
export const EVENT_TRANSITIONS: Record<ConcertStatus, ConcertStatus[]> = {
  draft:     ['published', 'cancelled'],
  pending:   ['published', 'on_sale', 'cancelled'],
  published: ['on_sale', 'offline'],
  on_sale:   ['stopped', 'off_sale', 'finished'],
  stopped:   ['on_sale', 'off_sale'],
  off_sale:  ['on_sale', 'finished'],
  offline:   ['published'],
  sold_out:  ['on_sale', 'off_sale', 'finished'],
  finished:  [],
  cancelled: [],
}

export function canTransition(from: ConcertStatus, to: ConcertStatus): boolean {
  return EVENT_TRANSITIONS[from]?.includes(to) ?? false
}