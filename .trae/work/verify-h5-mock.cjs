// H5 mock 验证：cancelOrder + listOrders (by userId + status) + getCurrentUser
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

;(async () => {
  console.log('[h5-mock] getCurrentUser')
  const me = await client.get('/users/me')
  assert(me.data?.id === '40001', `me.id = ${me.data?.id}`)
  assert(me.data?.realName && me.data?.idCardCipher, 'me 带实名')

  console.log('[h5-mock] listOrders by userId=40001')
  const listAll = await order.listOrders({ userId: '40001', page: 1, pageSize: 50 })
  assert(listAll.total >= 0, `total = ${listAll.total}`)
  assert(Array.isArray(listAll.list), 'listOrders 返回 list[]')

  console.log('[h5-mock] listOrders by status=pending')
  const listPending = await order.listOrders({ userId: '40001', status: 'pending', page: 1, pageSize: 50 })
  assert(listPending.list.every(o => o.status === 'pending'), 'list.status 全部是 pending')

  console.log('[h5-mock] 找一个 on_sale 演出下单，然后取消')
  const evList = await concert.listConcerts({ page: 1, pageSize: 50, status: 'on_sale' })
  const ev = evList.list[0]
  if (!ev) { console.log('  ⚠️ 无 on_sale 演出，跳过取消校验'); return }
  const tiers = await concert.listTickets(ev.id)
  if (tiers.length === 0) { console.log('  ⚠️ 无票档，跳过取消校验'); return }
  const t = tiers[0]
  const buyer = { name: '张三', idCardCipher: '110105**********1234', phone: '13800000001' }

  const before = (await order.listOrders({ userId: '40001', status: 'pending', page: 1, pageSize: 50 })).list
  const o = await order.createOrder({ concertId: ev.id, items: [{ ticketTierId: t.id, quantity: 1 }], buyer, payMethod: 'mock' })
  assert(o.status === 'pending', `下单成功 status=pending（实际${o.status}）`)
  assert(o.expireTime && Date.parse(o.expireTime.replace(' ', 'T') + 'Z') > Date.now(), 'expireTime > now')

  const detail = await order.getOrderDetail(o.id)
  assert(detail.id === o.id, 'getOrderDetail 匹配')

  // 取消
  const cancelled = await order.cancelOrder(o.id)
  assert(cancelled.status === 'cancelled', `cancel 后 status=cancelled（实际${cancelled.status}）`)
  assert(!!cancelled.cancelledAt, 'cancelledAt 已写入')

  const after = (await order.listOrders({ userId: '40001', status: 'pending', page: 1, pageSize: 50 })).list
  assert(after.length === before.length, `pending 订单数回到取消前（before=${before.length} after=${after.length}）`)

  // 重复取消 → 400013
  try {
    await order.cancelOrder(o.id)
    console.log('  ❌ 重复取消应当抛错'); process.exitCode = 1
  } catch (e) {
    const code = e?.response?.data?.code
    assert(code === 400013, `重复取消业务码 400013（实际 ${code}）`)
  }

  console.log('[h5-mock] getOrderDetail 不存在 → 400012')
  try {
    await order.getOrderDetail('no-such-id')
    console.log('  ❌ 应当抛错'); process.exitCode = 1
  } catch (e) {
    const code = e?.response?.data?.code
    assert(code === 400012, `业务码 400012（实际 ${code}）`)
  }
})().catch(e => { console.error(e); process.exit(1) })