// H4 mock createOrder 端到端契约校验
const path = require('path')
const root = path.resolve(__dirname, '../..')
process.chdir(root)

const api = require(path.join(root, 'packages/api/dist/index.cjs'))
const client = api.createApiClient({ baseURL: '/api/v1', timeout: 15000, getToken: () => null })
api.installMock(client)
const concert = api.concertApi(client)
const order = api.orderApi(client)

function assert(cond, msg) {
  if (cond) console.log('  ✅', msg)
  else { console.log('  ❌', msg); process.exitCode = 1 }
}

async function expectFail(fn, expectedCode, label) {
  try {
    await fn()
    console.log(`  ❌ ${label} 应当抛错`); process.exitCode = 1
  } catch (e) {
    const code = e?.response?.data?.code
    assert(code === expectedCode, `${label} → 业务码 ${expectedCode}（实际 ${code}）`)
  }
}

;(async () => {
  // 1) 找 on_sale 演出和它的票档
  const list = await concert.listConcerts({ page: 1, pageSize: 50, status: 'on_sale' })
  const ev = list.list.find(x => x.status === 'on_sale')
  assert(!!ev, `on_sale 演出存在: ${ev?.id}`)
  const tiers = await concert.listTickets(ev.id)
  assert(tiers.length >= 1, `tiers.length = ${tiers.length}`)
  const t1 = tiers[0]
  const t2 = tiers[1] || tiers[0]
  const validBuyer = { name: '张三', idCardCipher: '110105**********1234', phone: '13800000001' }

  console.log('[h4-mock] 正常下单')
  const ok = await order.createOrder({
    concertId: ev.id,
    items: [{ ticketTierId: t1.id, quantity: 1 }],
    buyer: validBuyer,
    payMethod: 'mock',
  })
  assert(ok.id && ok.orderNo && ok.orderNo.startsWith('CON'), `下单成功 id=${ok.id} orderNo=${ok.orderNo}`)
  assert(Array.isArray(ok.items) && ok.items.length === 1, '订单 items 数组长度 1')
  assert(typeof ok.totalAmount === 'number' && ok.totalAmount > 0, `totalAmount=${ok.totalAmount}`)
  assert(ok.status === 'pending', `status=pending（实际 ${ok.status}）`)
  assert(ok.buyer?.idCardCipher === validBuyer.idCardCipher, 'buyer.idCardCipher 透传')
  assert(ok.payMethod === 'mock', 'payMethod=mock')

  console.log('[h4-mock] 错误码覆盖')
  // 400003 活动不存在
  await expectFail(
    () => order.createOrder({ concertId: '9999999', items: [{ ticketTierId: t1.id, quantity: 1 }], buyer: validBuyer, payMethod: 'mock' }),
    400003, '400003 活动不存在',
  )
  // 400007 票档不存在
  await expectFail(
    () => order.createOrder({ concertId: ev.id, items: [{ ticketTierId: 'no-such-tier', quantity: 1 }], buyer: validBuyer, payMethod: 'mock' }),
    400007, '400007 票档不存在',
  )
  // 400016 姓名空
  await expectFail(
    () => order.createOrder({ concertId: ev.id, items: [{ ticketTierId: t1.id, quantity: 1 }], buyer: { ...validBuyer, name: '' }, payMethod: 'mock' }),
    400016, '400016 姓名空',
  )
  // 400016 身份证过短
  await expectFail(
    () => order.createOrder({ concertId: ev.id, items: [{ ticketTierId: t1.id, quantity: 1 }], buyer: { ...validBuyer, idCardCipher: '123' }, payMethod: 'mock' }),
    400016, '400016 身份证过短',
  )
  // 400009 数量 0
  await expectFail(
    () => order.createOrder({ concertId: ev.id, items: [{ ticketTierId: t1.id, quantity: 0 }], buyer: validBuyer, payMethod: 'mock' }),
    400009, '400009 数量 0',
  )
  // 400010 超出单票档限购（tier.maxBuyQuantity 一般 ≤ 3）
  await expectFail(
    () => order.createOrder({ concertId: ev.id, items: [{ ticketTierId: t1.id, quantity: 999 }], buyer: validBuyer, payMethod: 'mock' }),
    400010, '400010 超出单票档限购',
  )
  // 400011 5 秒内重复同 buyer + 同 items → 幂等
  await expectFail(
    () => order.createOrder({ concertId: ev.id, items: [{ ticketTierId: t2.id, quantity: 1 }], buyer: { name: '李四', idCardCipher: '110105**********5678', phone: '13800000002' }, payMethod: 'mock' }).then(() =>
      order.createOrder({ concertId: ev.id, items: [{ ticketTierId: t2.id, quantity: 1 }], buyer: { name: '李四', idCardCipher: '110105**********5678', phone: '13800000002' }, payMethod: 'mock' }),
    ),
    400011, '400011 5s 幂等',
  )

  console.log('[h4-mock] sold_out 票档应触发 400008')
  const soldList = await concert.listConcerts({ page: 1, pageSize: 50, status: 'sold_out' })
  if (soldList.list.length > 0) {
    const soldEv = soldList.list[0]
    const soldTiers = await concert.listTickets(soldEv.id)
    if (soldTiers.length > 0) {
      // sold_out 活动状态不在活动级黑名单里；继续走到票档校验，发现 availableStock=0 → 400008
      await expectFail(
        () => order.createOrder({ concertId: soldEv.id, items: [{ ticketTierId: soldTiers[0].id, quantity: 1 }], buyer: validBuyer, payMethod: 'mock' }),
        400008, 'sold_out 票档售罄',
      )
    }
  }

  console.log('[h4-mock] 订单 GET 接口占位返回')
  const listRes = await order.listOrders({ page: 1, pageSize: 10 })
  assert(listRes && typeof listRes.total === 'number', 'listOrders 返回包含 total')

  const detail = await order.getOrderDetail(ok.id)
  assert(detail.id === ok.id, 'getOrderDetail 返回的 id 匹配')
})().catch(e => { console.error(e); process.exit(1) })