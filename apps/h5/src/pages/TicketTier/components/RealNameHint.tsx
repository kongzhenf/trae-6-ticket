import { NoticeBar } from 'react-vant'

/**
 * 实名购票提示（H3 顶部 + 详情页吸收前）
 * - 注意：react-vant 3.3.5 NoticeBar 的 `leftIcon` 走 `React.cloneElement`，
 *   传 string 会被当作非 element 报错；故不使用 leftIcon，改在文本前加 emoji。
 */
export default function RealNameHint() {
  return (
    <div style={{ padding: '8px 12px 0' }}>
      <NoticeBar
        color="#1677ff"
        background="#e6f4ff"
        style={{ borderRadius: 8 }}
        scrollable={false}
      >
        <span aria-hidden="true">ℹ️</span> 本演出需实名购票，一证一票。下一步将填写购票人真实姓名与身份证号。
      </NoticeBar>
    </div>
  )
}