import { Card, Skeleton, Statistic } from 'antd'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface MetricCardProps {
  /** 指标标题，如「今日订单」 */
  title: string
  /** 数值；为 undefined 时显示 Skeleton 占位 */
  value?: number
  /** 前缀（如 ¥） */
  prefix?: ReactNode
  /** 后缀（如 单 / 场 / 人 / 分） */
  suffix?: ReactNode
  /** 是否高亮（首屏 4 个核心指标用淡蓝底） */
  highlight?: boolean
  /** 鼠标悬浮的小提示 */
  hint?: string
  /** 是否骨架状态 */
  loading?: boolean
  /** 价格精度：true 表示按分渲染为 ¥xx.xx；false 原样渲染 */
  isMoney?: boolean
}

/**
 * Dashboard 顶部 8 个指标卡
 *
 * 金额单位约定：上游接口统一返回「分」，传入 isMoney=true 时除以 100 并加 ¥ 前缀。
 * 非金额指标（单/场/人/分）传 isMoney=false，suffix 直接拼到 value 之后。
 */
export default function MetricCard({
  title,
  value,
  prefix,
  suffix,
  highlight = false,
  hint,
  loading = false,
  isMoney = false,
}: MetricCardProps) {
  const renderValue = () => {
    if (loading || value === undefined || value === null) {
      return <Skeleton.Input active size="small" style={{ width: 96 }} />
    }
    if (isMoney) {
      return (
        <Statistic
          value={(value / 100).toFixed(2)}
          prefix={prefix ?? '¥'}
          suffix={suffix}
        />
      )
    }
    return <Statistic value={value} prefix={prefix} suffix={suffix} />
  }

  return (
    <Card
      variant="outlined"
      className={cn(
        'transition-colors',
        highlight
          ? 'bg-indigo-50 border-indigo-200 shadow-sm'
          : 'bg-white',
      )}
      styles={{
        body: { padding: '20px 24px' },
        header: {
          borderBottom: highlight ? '1px solid #e0e7ff' : undefined,
          minHeight: 48,
        },
      }}
      title={
        <span className={highlight ? 'text-indigo-700 font-medium' : undefined}>
          {title}
        </span>
      }
      extra={hint ? <span className="text-slate-400 text-xs">{hint}</span> : null}
    >
      <div className="text-2xl font-semibold leading-none">{renderValue()}</div>
    </Card>
  )
}
