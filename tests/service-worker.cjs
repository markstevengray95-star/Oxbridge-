const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const handlers = {}, deleted = [], stored = []
let offline = false
vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), {
  URL, Response,
  self: { location: { origin: 'https://app.example' }, addEventListener: (name, callback) => { handlers[name] = callback }, clients: { claim() {} }, skipWaiting() {} },
  caches: { keys: async () => ['oxbridge-tutor-v12', 'oxbridge-tutor-v13', 'unrelated-cache'], delete: async key => deleted.push(key),
    open: async () => ({ match: async () => undefined, put: async key => stored.push(key), addAll: async () => {} }) },
  fetch: async () => { if (offline) throw new Error('offline'); return new Response('private account page') },
})
async function main() {
  let work
  handlers.activate({ waitUntil: promise => { work = promise } }); await work
  assert.deepEqual(deleted, ['oxbridge-tutor-v12'])
  function request(path, mode = 'cors') {
    let response
    handlers.fetch({ request: { method: 'GET', url: `https://app.example${path}`, mode }, respondWith: promise => { response = promise } })
    return response
  }
  assert.equal(await (await request('/account', 'navigate')).text(), 'private account page')
  assert.equal(stored.length, 0)
  assert.equal(request('/account?_rsc=example'), undefined)
  assert.equal(request('/api/privacy/export'), undefined)
  await request('/_next/static/test.js')
  assert.equal(stored.length, 1)
  offline = true
  const fallback = await request('/account', 'navigate')
  assert.equal(fallback.status, 503)
  assert.doesNotMatch(await fallback.text(), /private account page/)
  console.log('PASS: old private caches purged, unrelated caches retained, only static assets cached, and offline pages cannot leak account data')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
