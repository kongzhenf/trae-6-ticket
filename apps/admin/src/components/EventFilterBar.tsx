import { useMemo } from 'react'
import { Button, DatePicker, Input, Select, Space, Tooltip } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import type { ConcertStatus } from '@trae/shared'
import { EVENT_STATUS, EVENT_STATUS_LIST } from '@trae/shared'
import type { EventsFilter } from '@/hooks/useEvents'

const { RangePicker } = DatePicker

export interface EventFilterBarProps {
  value: EventsFilter
  onChange: (next: EventsFilter) => void
  onReset: () => void
  /** 是否正在加载（重置 / 搜索禁用） */
  loading?: boolean
  /** 创建按钮（与筛选区同行的右侧操作） */
  extra?: React.ReactNode
}

/**
 * 演出列表筛选条
 * - 关键字 / 状态下拉多选 / 开演时间范围 / 重置 / 自定义右侧（创建按钮）
 * - 受控组件：value 由父组件管理，触发 onChange 时父组件通常回到第 1 页
 */
export default function EventFilterBar({
  value,
  onChange,
  onReset,
  loading = false,
  extra,
}: EventFilterBarProps) {
  const statusOptions = useMemo(
    () =>
      EVENT_STATUS_LIST.map(s => ({
        label: EVENT_STATUS[s as ConcertStatus].label,
        value: s,
      })),
    [],
  )

  const rangeValue: [Dayjs | null, Dayjs | null] | undefined = value.startTimeRange
    ? [value.startTimeRange[0] ? dayjs(value.startTimeRange[0]) : null, value.startTimeRange[1] ? dayjs(value.startTimeRange[1]) : null]
    : undefined

  function patch(next: Partial<EventsFilter>) {
    onChange({ ...value, ...next })
  }

  function setStatus(next: string[]) {
    patch({ status: next.join(',') })
  }

  function setRange(next: [Dayjs | null, Dayjs | null] | null) {
    if (!next || (!next[0] && !next[1])) {
      patch({ startTimeRange: undefined })
      return
    }
    patch({
      startTimeRange: [
        next[0]?.toISOString() ?? '',
        next[1]?.toISOString() ?? '',
      ],
    })
  }

  const hasFilter =
    !!value.keyword?.trim() || !!value.status?.trim() || !!value.startTimeRange

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Space wrap size={12}>
        <Input.Search
          allowClear
          placeholder="搜索演出名称"
          style={{ width: 240 }}
          value={value.keyword ?? ''}
          onChange={e => patch({ keyword: e.target.value })}
          onSearch={v => patch({ keyword: v })}
          enterButton={<SearchOutlined />}
          disabled={loading}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="状态（可多选）"
          style={{ minWidth: 240, maxWidth: 360 }}
          value={value.status ? value.status.split(',').filter(Boolean) : undefined}
          onChange={(v: string[]) => setStatus(v ?? [])}
          options={statusOptions}
          maxTagCount="responsive"
          disabled={loading}
        />
        <RangePicker
          showTime={{ format: 'HH:mm' }}
          format="YYYY-MM-DD HH:mm"
          value={rangeValue}
          onChange={setRange}
          disabled={loading}
          placeholder={['开演起始', '开演截止']}
        />
        <Tooltip title="清空全部筛选条件">
          <Button
            icon={<ReloadOutlined />}
            onClick={onReset}
            disabled={loading || !hasFilter}
          >
            重置
          </Button>
        </Tooltip>
      </Space>
      <Space>{extra}</Space>
    </div>
  )
}
