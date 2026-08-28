import { CountDown } from 'react-vant'

export interface CountdownBadgeProps {
  /** 订单到期时间（mock ISO 字符串，如 '2026-08-26 12:34:56'） */
  expireTime: string
  /** 倒计时归零时回调（父组件可跳到「已失效」UI） */
  onFinish?: () => void
}

/**
 * 倒计时徽章
 * - react-vant 3.3.5 CountDown 接受 millisecond 时间戳
 * - mock ISO 形如 'YYYY-MM-DD HH:mm:ss'；转换为 ms
 */
export default function CountdownBadge({ expireTime, onFinish }: CountdownBadgeProps) {
  const target = new Date(expireTime.replace(' ', 'T') + 'Z').getTime()
  return (
    <div
      data-testid="countdown-badge"
      data-expire={expireTime}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 8,
        background: '#fff7e6',
        color: '#c2410c',
        fontSize: 12,
        margin: '0 12px 12px',
      }}
    >
      <span>⏱ 订单将于</span>
      <CountDown
        time={target > 0 ? target - Date.now() : 0}
        format="mm:ss"
        autoStart
        onFinish={onFinish}
        style={{ fontWeight: 700, fontSize: 14, color: '#c2410c' }}
      />
      <span>后失效</span>
    </div>
  )
}