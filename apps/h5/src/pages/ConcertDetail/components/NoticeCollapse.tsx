import { Collapse as RVCollapse } from 'react-vant'

export interface NoticeCollapseProps {
  /** 购票须知（markdown / 纯文本） */
  notice?: string
  /** 退改规则（markdown / 纯文本） */
  refundPolicy?: string
}

/**
 * 折叠面板：购票须知 / 退改规则
 * - 任一内容为空时该面板整体不渲染（避免出现空标题的空盒）
 * - 手风琴模式（accordion）一次只展开一个
 * - 渲染层在父页面渲染 Markdown；此处只负责"标题 + 折叠"骨架
 */
export default function NoticeCollapse({ notice, refundPolicy }: NoticeCollapseProps) {
  if (!notice && !refundPolicy) return null

  return (
    <div
      style={{
        margin: '12px 12px 0',
        background: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <RVCollapse
        accordion
        border={false}
        initExpanded={[]}
      >
        {notice && (
          <RVCollapse.Item title="购票须知" name="notice">
            <div
              data-testid="detail-notice-body"
              style={{ padding: '4px 16px 16px', fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {notice}
            </div>
          </RVCollapse.Item>
        )}
        {refundPolicy && (
          <RVCollapse.Item title="退改规则" name="refund">
            <div
              data-testid="detail-refund-body"
              style={{ padding: '4px 16px 16px', fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {refundPolicy}
            </div>
          </RVCollapse.Item>
        )}
      </RVCollapse>
    </div>
  )
}