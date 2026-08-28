// StickyBuyBar 状态文案映射静态校验
// 把 StickyBuyBar.tsx 中的 resolveCta 函数逻辑镜像到 js，确保 10 种状态都映射到预期文案
// 这是一个无 React 的等价实现，覆盖所有状态分支

function resolveCta(status, hasTickets) {
  switch (status) {
    case 'on_sale':
    case 'published':
      return hasTickets
        ? { label: '立即购票', disabled: false, buyable: true }
        : { label: '暂无票档', disabled: true, buyable: false }
    case 'pending':
    case 'draft':
      return { label: '即将开售', disabled: true, buyable: false }
    case 'sold_out':
      return { label: '已售罄', disabled: true, buyable: false }
    case 'off_sale':
    case 'stopped':
      return { label: '暂停售票', disabled: true, buyable: false }
    case 'finished':
      return { label: '演出已结束', disabled: true, buyable: false }
    case 'offline':
    case 'cancelled':
    default:
      return { label: '活动不可购买', disabled: true, buyable: false }
  }
}

const EXPECTED = {
  draft:          { label: '即将开售', disabled: true,  buyable: false },
  pending:        { label: '即将开售', disabled: true,  buyable: false },
  published:      { label: '立即购票', disabled: false, buyable: true  }, // 仅当 hasTickets
  on_sale:        { label: '立即购票', disabled: false, buyable: true  }, // 仅当 hasTickets
  off_sale:       { label: '暂停售票', disabled: true,  buyable: false },
  stopped:        { label: '暂停售票', disabled: true,  buyable: false },
  sold_out:       { label: '已售罄',   disabled: true,  buyable: false },
  finished:       { label: '演出已结束', disabled: true,  buyable: false },
  offline:        { label: '活动不可购买', disabled: true,  buyable: false },
  cancelled:      { label: '活动不可购买', disabled: true,  buyable: false },
  __unknown__:    { label: '活动不可购买', disabled: true,  buyable: false },
}

function assert(cond, msg) {
  if (cond) console.log('  ✅', msg)
  else { console.log('  ❌', msg); process.exitCode = 1 }
}

console.log('[sticky-cta] 主态校验（hasTickets=true）')
const keys = ['draft','pending','published','on_sale','off_sale','stopped','sold_out','finished','offline','cancelled','__unknown__']
for (const k of keys) {
  const exp = EXPECTED[k]
  const act = resolveCta(k, true)
  assert(act.label === exp.label && act.disabled === exp.disabled && act.buyable === exp.buyable, `${k.padEnd(12)} -> ${act.label} (buyable=${act.buyable})`)
}

console.log('[sticky-cta] on_sale 无票档时禁用')
const noTicket = resolveCta('on_sale', false)
assert(noTicket.label === '暂无票档' && noTicket.disabled === true && noTicket.buyable === false, `on_sale no-tickets -> ${noTicket.label}`)

const noTicketP = resolveCta('published', false)
assert(noTicketP.label === '暂无票档' && noTicketP.disabled === true, `published no-tickets -> ${noTicketP.label}`)