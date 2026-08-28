import { CountDown } from 'react-vant'

export interface CountdownTextProps {
  /** 订单到期时间（mock ISO 字符串） */
  expireTime: string
  /** 归零回调 */
  onFinish?: () => void
}

/**
 * 倒计时文本（H5 详情页用）
 * - mm:ss 格式
 * - 归零时触发 onFinish，由父组件切「已失效」UI
 */
export default function CountdownText({ expireTime, onFinish }: CountdownTextProps) {
  const target = new Date(expireTime.replace(' ', 'T') + 'Z').getTime()
  const left = target > 0 ? Math.max(0, target - Date.now()) : 0
  return (
    <div
      data-testid="order-countdown-text"
      data-expire={expireTime}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#c2410c' }}
    >
      <span>⏱</span>
      <CountDown
        time={left}
        format="mm:ss"
        autoStart
        onFinish={onFinish}
        style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}
      />
      <span>后失效</span>
    </div>
  )
}