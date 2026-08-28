// H7 mock auth 端到端
const path = require('path')
const root = path.resolve(__dirname, '../..')
process.chdir(root)

const api = require(path.join(root, 'packages/api/dist/index.cjs'))
const client = api.createApiClient({ baseURL: '/api/v1', timeout: 15000, getToken: () => null })
api.installMock(client)
const userApi = api.userApi(client)

function assert(cond, msg) {
  if (cond) console.log('  ✅', msg)
  else { console.log('  ❌', msg); process.exitCode = 1 }
}

async function expectFail(fn, code, label) {
  try { await fn(); console.log(`  ❌ ${label} 应当抛错`); process.exitCode = 1 }
  catch (e) { assert(e?.response?.data?.code === code, `${label} → ${code}（实际 ${e?.response?.data?.code}）`) }
}

;(async () => {
  console.log('[h7-mock] 账号密码登录（user1/123456）')
  const r = await userApi.login({ account: 'user1', password: '123456' })
  assert(r.token === 'mock-token-40001', `token=mock-token-40001（实际 ${r.token}）`)
  assert(r.user?.id === '40001', `user.id=40001（实际 ${r.user?.id}）`)
  assert(r.user?.nickname === '用户001', `nickname=用户001（实际 ${r.user?.nickname}）`)

  console.log('[h7-mock] /auth/me 带 token')
  // 用 token 包装新 client
  const authedClient = api.createApiClient({
    baseURL: '/api/v1', timeout: 15000,
    getToken: () => r.token,
  })
  api.installMock(authedClient)
  const me = await api.userApi(authedClient).getCurrentUser()
  assert(me.id === '40001', `me.id=40001（实际 ${me.id}）`)

  console.log('[h7-mock] /auth/me 无 token → 401')
  await expectFail(() => api.userApi(client).getCurrentUser(), 401, '未登录访问 /auth/me')

  console.log('[h7-mock] /auth/me 错 token → 401')
  const badClient = api.createApiClient({
    baseURL: '/api/v1', timeout: 15000, getToken: () => 'mock-token-99999',
  })
  api.installMock(badClient)
  await expectFail(() => api.userApi(badClient).getCurrentUser(), 401, 'token 无效')

  console.log('[h7-mock] 短信登录 user2 + 验证码 1234')
  const r2 = await userApi.login({ account: 'user2', password: 'wrong', code: '1234' })
  assert(r2.token === 'mock-token-40002', `token=mock-token-40002（实际 ${r2.token}）`)

  console.log('[h7-mock] 错误密码 → 400001')
  await expectFail(() => userApi.login({ account: 'user1', password: 'wrong' }), 400001, '错误密码')

  console.log('[h7-mock] 错误验证码 → 400001')
  await expectFail(() => userApi.login({ account: 'user1', code: '0000' }), 400001, '错误验证码')

  console.log('[h7-mock] 账号不存在 → 400001')
  await expectFail(() => userApi.login({ account: 'user999', password: '123456' }), 400001, '账号不存在')

  console.log('[h7-mock] logout → { ok: true }')
  const lo = await userApi.logout()
  assert(lo.ok === true, 'logout 返回 { ok: true }')
})().catch(e => { console.error(e); process.exit(1) })