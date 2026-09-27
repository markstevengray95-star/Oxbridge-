const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const source = ts.transpileModule(fs.readFileSync('components/cloud-progress-sync.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve() }

function harness({ authError = null, restoreError = null, rows = [], initial = {} } = {}) {
  const values = new Map(Object.entries(initial))
  const storage = {
    get length() { return values.size }, key: index => [...values.keys()][index],
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key),
  }
  const events = {}, writes = [], timers = new Map()
  let authCallback, cleanup, nextTimer = 1
  const state = { authError, restoreError, rows }
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: state.authError ? null : { id: 'user-1' } }, error: state.authError }),
      onAuthStateChange: callback => { authCallback = callback; return { data: { subscription: { unsubscribe() {} } } } },
    },
    from: () => ({ select() { return this }, eq() { return this },
      then(resolve) { return Promise.resolve({ data: state.rows, error: state.restoreError }).then(resolve) },
      async upsert(row) { writes.push(row); return { error: null } },
    }),
  }
  const exports = {}
  vm.runInNewContext(source, {
    exports, console: { warn() {} }, localStorage: storage, sessionStorage: { getItem: () => 'user-1:all-app-state-v5', removeItem() {}, setItem() {} },
    navigator: { onLine: true }, CustomEvent: class { constructor(type) { this.type = type } },
    window: { addEventListener: (name, callback) => { events[name] = callback }, removeEventListener() {}, dispatchEvent() {}, location: { reload() {} },
      setInterval: callback => { const id = nextTimer++; timers.set(id, callback); return id }, clearInterval: id => timers.delete(id) },
    document: { addEventListener() {}, removeEventListener() {} },
    require: name => ({ react: { useEffect: effect => { cleanup = effect() } }, '@/lib/supabase/client': { createClient: () => supabase }, '@/lib/personal-tutor': { PROGRESS_KEY: 'oxbridge-progress' } })[name],
  })
  exports.CloudProgressSync()
  return { state, storage, writes, timers, events, auth: (...args) => authCallback(...args), cleanup: () => cleanup() }
}

async function main() {
  const h = harness({ authError: { message: 'offline' }, initial: { 'oxbridge-notes': 'unsaved work' } })
  await flush()
  assert.equal(h.storage.getItem('oxbridge-notes'), 'unsaved work')
  h.auth('INITIAL_SESSION', null)
  assert.equal(h.storage.getItem('oxbridge-notes'), 'unsaved work')
  h.auth('SIGNED_OUT', null)
  assert.equal(h.storage.getItem('oxbridge-notes'), null)
  h.cleanup()

  const retry = harness({ restoreError: { message: 'offline' }, initial: { 'oxbridge-notes': 'local' } })
  await flush()
  assert.equal(retry.timers.size, 0)
  retry.events.focus()
  await flush()
  assert.equal(retry.writes.length, 0, 'Failed restore must not upload stale data')
  retry.state.restoreError = null
  retry.events.online()
  await flush()
  assert.equal(retry.timers.size, 1, 'A successful retry starts automatic saving')
  assert.equal(retry.writes[0].state_key, 'oxbridge-notes')
  const saved = retry.storage.getItem('__oxbridge_cloud_sync_baseline_v1')
  retry.cleanup()

  const deleted = harness({ initial: { 'oxbridge-notes': 'local', '__oxbridge_cloud_sync_baseline_v1': saved, '__oxbridge_local_cache_owner_v1': 'user-1' } })
  await flush()
  assert.equal(deleted.storage.getItem('oxbridge-notes'), null, 'Cloud deletions must not be resurrected')
  assert.equal(deleted.writes.length, 0)
  deleted.cleanup()
  console.log('PASS: transient auth failure preserves work, explicit logout clears it, failed restore retries, and cloud deletion survives reload')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
