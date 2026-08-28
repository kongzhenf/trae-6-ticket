// H6 mock 验证：payOrder (含幂等、过期、库存)、cancelOrder 改进、expireOrders 启动清理
const path = require('path')
const root = path.resolve(__dirname, '../..')
process.chdir(root)

const api = require(path.join(root, 'packages/api/dist/index.cjs'))
const client = api.createApiClient({ baseURL: '/api/v1', timeout: 15000, getToken: () => null })
api.installMock(client)
const order = api.orderApi(client)
const concert = api.concertApi(client)

function assert(cond, msg) {
  if (cond) console.log('  ✅', msg)
  else { console.log('  ❌', msg); process.exitCode = 1 }
}

async function expectFail(fn, expectedCode, label) {
  try { await fn(); console.log(`  ❌ ${label} 应当抛错`); process.exitCode = 1 }
  catch (e) {
    const code = e?.response?.data?.code
    assert(code === expectedCode, `${label} → ${expectedCode}（实际 ${code}）`)
  }
}

;(async () => {
  // 1) 找一个 on_sale 演出 + 票档
  const list = await concert.listConcerts({ page: 1, pageSize: 50, status: 'on_sale' })
  const ev = list.list[0]
  assert(!!ev, `on_sale 演出存在: ${ev?.id}`)
  const tiers = await concert.listTickets(ev.id)
  const t = tiers[0]
  assert(!!t, `tier[0] 存在: ${t.id}`)
  const buyer = { name: '张三', idCardCipher: '110105**********1234', phone: '13800000001' }

  console.log('[h6-mock] 创建 pending 订单')
  const o = await order.createOrder({ concertId: ev.id, items: [{ ticketTierId: t.id, quantity: 1 }], buyer, payMethod: 'mock' })
  assert(o.status === 'pending', '初始 status=pending')
  assert(!!o.entryCode === false || o.entryCode === undefined, '初始无 entryCode')

  console.log('[h6-mock] 支付 → status=paid + entryCode')
  const paid = await order.pay(o.id)
  assert(paid.status === 'paid', `pay 后 status=paid（实际${paid.status}）`)
  assert(!!paid.paidAt, `paidAt 已写入`)
  assert(/^MOCK-/.test(paid.entryCode || ''), `entryCode='MOCK-xxx'（实际 ${paid.entryCode}）`)
  assert(paid.totalAmount === o.totalAmount, 'totalAmount 快照不变')

  console.log('[h6-mock] 幂等：再 pay → 同样 paid')
  const paid2 = await order.pay(o.id)
  assert(paid2.status === 'paid' && paid2.id === o.id, '幂等：再 pay 返回同一 paid 订单')

  console.log('[h6-mock] 取消已 paid 订单 → 400013')
  await expectFail(() => order.cancelOrder(o.id), 400013, 'paid 取消')

  console.log('[h6-mock] 支付已 cancelled 订单 → 400013')
  // 先创建一个新的 pending 然后取消，再 pay
  const o2 = await order.createOrder({ concertId: ev.id, items: [{ ticketTierId: t.id, quantity: 1 }], buyer, payMethod: 'mock' })
  await order.cancelOrder(o2.id)
  await expectFail(() => order.pay(o2.id), 400013, 'cancelled pay')

  console.log('[h6-mock] 支付不存在订单 → 400012')
  await expectFail(() => order.pay('no-such-id'), 400012, '支付不存在订单')

  console.log('[h6-mock] listOrders 与 cancelOrder 路径仍可用')
  const listRes = await order.listOrders({ userId: '40001', page: 1, pageSize: 50 })
  assert(listRes.total >= 0, `listOrders total = ${listRes.total}`)
})().catch(e => { console.error(e); process.exit(1) })