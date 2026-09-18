// 小刀 AI 浏览器 MCP Server · 回归测试套件（单一文件，四套）
//   用法: node tests/mcp-suite.mjs --exe <AI-Fbowser-Mcp.exe> [--suite all|sweep|frames|transport|pool|cdp] [--per-call 30000]
//   退出码: 0 = 全部通过; 1 = 有失败项
//
// 设计约定（与项目历史探针一致）:
//   · initialize 用 Content-Length 帧；其余请求用**裸行**（服务端两种帧都支持）
//   · 服务端 stderr 是 GBK(CP936) ⇒ 必须用 TextDecoder('gbk') 解码，否则中文全是替换符
//   · 回包按 "id":<n> 匹配；CL 模式下回包**无尾随换行**，故必须按 Content-Length 解析而不是按行切
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const EXE = arg('--exe', '')
const SUITE = arg('--suite', 'all')
const PER_CALL = Number(arg('--per-call', '30000'))
// CL 声明**大于**实际时，服务端要等满声明长度才判定错位；历史实测该窗口约 19s ⇒ 默认给 25s。
// （教训：早期探针用 2.5s 等待，把"正常等待窗口"误判成"永久挂起"——测试自身的 bug。）
const LARGE_WAIT = Number(arg('--large-wait', '25000'))
if (!EXE || !fs.existsSync(EXE)) { console.error('用法: node tests/mcp-suite.mjs --exe <AI-Fbowser-Mcp.exe> [--suite all|sweep|frames|transport|pool|cdp]'); process.exit(2) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
const gbk = new TextDecoder('gbk')
const results = []
const record = (suite, name, ok, detail = '') => { results.push({ suite, name, ok, detail }); console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? '   ' + detail : ''}`) }

// ───────────────────────── 客户端 ─────────────────────────
class Client {
  constructor(exe) {
    this.dir = path.dirname(exe)
    for (const f of fs.readdirSync(this.dir)) if (f.startsWith('mcp_cache.db')) { try { fs.unlinkSync(path.join(this.dir, f)) } catch {} }
    this.child = spawn(exe, ['--mcp-stdio'], { cwd: this.dir, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
    this.buf = Buffer.alloc(0); this.frames = []; this.stderr = ''; this.exited = null
    this.child.stdout.on('data', d => {
      this.buf = Buffer.concat([this.buf, d])
      for (;;) {
        const text = this.buf.toString('utf8')
        if (/^Content-Length:/i.test(text)) {              // CL 帧
          const m = /^Content-Length:\s*(\d+)\r?\n\r?\n/i.exec(text); if (!m) break
          const head = m[0].length, len = Number(m[1])
          if (this.buf.length < head + len) break
          this.frames.push(this.buf.subarray(head, head + len).toString('utf8'))
          this.buf = this.buf.subarray(head + len); continue
        }
        const nl = this.buf.indexOf(0x0a)                      // 裸行帧
        if (nl < 0) break
        this.frames.push(this.buf.subarray(0, nl).toString('utf8').trim())
        this.buf = this.buf.subarray(nl + 1)
      }
    })
    this.child.stderr.on('data', d => { this.stderr += gbk.decode(d, { stream: true }) })
    this.child.on('exit', c => { this.exited = c })
    this.id = 1000
  }
  send(obj) { this.child.stdin.write(JSON.stringify(obj) + '\n') }
  sendCL(obj) { const b = JSON.stringify(obj); this.child.stdin.write(`Content-Length: ${Buffer.byteLength(b)}\r\n\r\n${b}`) }
  sendRaw(text) { this.child.stdin.write(text) }
  find(id) { return this.frames.find(f => f.includes(`"id":${id},`) || f.includes(`"id":${id}}`)) }
  async waitId(id, ms = PER_CALL) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const f = this.find(id); if (f) return f; await sleep(20) } return null }
  async call(name, args = {}, ms = PER_CALL) { const id = ++this.id; this.send({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }); const f = await this.waitId(id, ms); return { id, raw: f, ms: Date.now() } }
  async ready(ms = 20000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (this.stderr.includes('MCP 服务已就绪')) return true; await sleep(100) } return false }
  async init() { this.sendCL({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'mcp-suite', version: '1' } } }); await this.ready(); await sleep(300); this.sendRaw('{"jsonrpc":"2.0","method":"notifications/initialized"}\n'); await sleep(300) }
  kill() { try { this.child.kill() } catch {} }
}
const textOf = raw => { try { const j = JSON.parse(raw); return j.result ? String(j.result.content?.[0]?.text ?? JSON.stringify(j.result)) : '[错误] ' + (j.error?.message ?? raw) } catch { return raw } }
const isToolError = raw => { try { const j = JSON.parse(raw); return j.result?.isError === true || /"success"\s*:\s*false/.test(textOf(raw)) } catch { return true } }

// ───────────────────────── 1) 全量 348 工具扫描 ─────────────────────────
async function suiteSweep() {
  const c = new Client(EXE); await c.init()
  c.send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
  const tl = await c.waitId(2, 30000)
  if (!tl) { record('sweep', 'tools/list 有回包', false); c.kill(); return }
  const tools = (JSON.parse(tl).result?.tools || []).map(t => t.name)
  record('sweep', 'tools/list 工具数 = 348', tools.length === 348, `实际 ${tools.length}`)
  const stat = { ok: 0, 'tool-error': 0, 'bad-json': 0, 'no-reply': 0 }
  const detail = []
  const t0 = Date.now()
  for (const n of tools) {
    const id = ++c.id
    c.send({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: n, arguments: {} } })
    const f = await c.waitId(id, PER_CALL)
    if (!f) { stat['no-reply']++; detail.push({ tool: n, kind: 'no-reply' }); continue }
    try { JSON.parse(f) } catch { stat['bad-json']++; detail.push({ tool: n, kind: 'bad-json', raw: f.slice(0, 200) }); continue }
    if (isToolError(f)) { stat['tool-error']++; } else { stat['ok']++ }
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1)
  record('sweep', `${tools.length}/${tools.length} 个工具有回执（${secs}s）`, stat['no-reply'] + stat['bad-json'] === 0, JSON.stringify(stat))
  fs.writeFileSync(path.join(process.cwd(), `sweep-${Date.now()}.json`), JSON.stringify({ tools: tools.length, stat, detail }, null, 2))
  c.kill()
}

// ───────────────────────── 2) 帧族（CL/裸行/管线化/NUL/CL 失配两向） ─────────────────────────
async function suiteFrames() {
  // P1 CL ×3
  {
    const c = new Client(EXE); await c.init()
    let got = 0
    for (const id of [101, 102, 103]) { c.sendCL({ jsonrpc: '2.0', id, method: 'ping', params: {} }); if (await c.waitId(id, 8000)) got++ }
    record('frames', 'P1 合法 CL 帧 ×3 全部回包', got === 3, `收到 ${got}/3`)
    // P8 管线化：同一次写入的两条 CL 帧
    const a = JSON.stringify({ jsonrpc: '2.0', id: 109, method: 'ping', params: {} }), b = JSON.stringify({ jsonrpc: '2.0', id: 110, method: 'ping', params: {} })
    c.sendRaw(`Content-Length: ${Buffer.byteLength(a)}\r\n\r\n${a}Content-Length: ${Buffer.byteLength(b)}\r\n\r\n${b}`)
    const g1 = await c.waitId(109, 8000), g2 = await c.waitId(110, 8000)
    record('frames', 'P8 同一次写入的两条 CL 帧(管线化)都回包', !!g1 && !!g2, `109=${!!g1} 110=${!!g2}`)
    record('frames', 'P1/P8 全程服务器存活', c.exited === null, `exit=${c.exited}`)
    c.kill()
  }
  // P2 CL 帧体含首尾空白 / P3 裸行 ×3 / P4 裸行参数含字面量 Content-Length:
  {
    const c = new Client(EXE); await c.init()
    const body = '  ' + JSON.stringify({ jsonrpc: '2.0', id: 104, method: 'ping', params: {} }) + '  '
    c.sendRaw(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`)
    record('frames', 'P2 CL 帧体含首尾空白仍正常', !!(await c.waitId(104, 8000)))
    let got = 0
    for (const id of [105, 106, 107]) { c.send({ jsonrpc: '2.0', id, method: 'ping', params: {} }); if (await c.waitId(id, 8000)) got++ }
    record('frames', 'P3 裸行请求 ×3 全部回包', got === 3, `收到 ${got}/3`)
    c.send({ jsonrpc: '2.0', id: 108, method: 'tools/call', params: { name: 'browser_json', arguments: { data: 'Content-Length: 999' } } })
    record('frames', 'P4 裸行参数含字面量 Content-Length: 不误判', !!(await c.waitId(108, 15000)) && c.exited === null)
    c.kill()
  }
  // P6 裸行含真实 NUL
  {
    const c = new Client(EXE); await c.init()
    const bad = Buffer.from('{"jsonrpc":"2.0","id":120,"method":"ping","x":"\u0000"}', 'utf8')
    c.child.stdin.write(Buffer.concat([bad, Buffer.from('\n')]))
    await sleep(1200)
    const errFrame = c.frames.find(f => f.includes('-32700'))
    record('frames', 'P6 裸行含 NUL → -32700', !!errFrame)
    c.send({ jsonrpc: '2.0', id: 121, method: 'ping', params: {} })
    record('frames', 'P6 之后仍可继续服务', !!(await c.waitId(121, 8000)) && c.exited === null)
    c.kill()
  }
  // P7 CL 偏大（帧体不完整）/ P5 CL 偏小（错位）
  for (const [tag, id, cl] of [['P7', 130, 900], ['P5', 131, 8]]) {
    const c = new Client(EXE); await c.init()
    const body = JSON.stringify({ jsonrpc: '2.0', id, method: 'ping', params: {} })
    c.sendRaw(`Content-Length: ${cl}\r\n\r\n${body}`)
    // CL 偏小：立刻可判定错位；CL 偏大：服务端要等满**声明长度**才判定（实测约 19s）⇒ 分别用短/长等待
    await sleep(tag === 'P7' ? LARGE_WAIT : 2500)
    const explicit = c.frames.some(f => f.includes('-32700'))
    const alive = c.exited === null
    // 判据：不永久挂起 —— 要么显式协议错误且随后优雅退出，要么已退出
    const settled = explicit || !alive
    record('frames', `${tag} CL ${tag === 'P7' ? '偏大' : '偏小'} → 显式 -32700 或优雅退出（不永久挂起）`, settled, `explicit=${explicit} exited=${c.exited}`)
    c.kill()
  }
}

// ───────────────────────── 3) 传输用例（基线 / CL 失配两向） ─────────────────────────
async function suiteTransport() {
  {
    const c = new Client(EXE); await c.init()
    let got = 0
    for (const id of [201, 202, 203]) { c.send({ jsonrpc: '2.0', id, method: 'ping', params: {} }); if (await c.waitId(id, 8000)) got++ }
    record('transport', 'A 三个连续裸行请求全部回包', got === 3, `收到 ${got}/3`)
    c.kill()
  }
  {
    const c = new Client(EXE); await c.init()
    const body = JSON.stringify({ jsonrpc: '2.0', id: 210, method: 'ping', params: {} })
    c.sendRaw(`Content-Length: ${body.length - 10}\r\n\r\n${body}`)   // 声明小于实际
    await sleep(2500)
    const explicit = c.frames.some(f => f.includes('-32700'))
    record('transport', 'B Content-Length 小于实际 → 显式 -32700 或优雅退出', explicit || c.exited !== null, `explicit=${explicit} exit=${c.exited}`)
    c.kill()
  }
  {
    const c = new Client(EXE); await c.init()
    const body = JSON.stringify({ jsonrpc: '2.0', id: 211, method: 'ping', params: {} })
    c.sendRaw(`Content-Length: ${body.length + 500}\r\n\r\n${body}`)   // 声明大于实际
    await sleep(LARGE_WAIT)
    record('transport', 'C Content-Length 大于实际 → 不永久挂起', c.exited !== null || c.frames.some(f => f.includes('-32700')), `exit=${c.exited}`)
    c.kill()
  }
}

// ───────────────────────── 4) 工作池饱和（读线程快答） ─────────────────────────
async function suitePool() {
  const c = new Client(EXE); await c.init()
  const calmId = ++c.id; c.send({ jsonrpc: '2.0', id: calmId, method: 'tools/list', params: {} })
  const calmT0 = Date.now(); const calm = await c.waitId(calmId, 30000); const calmMs = Date.now() - calmT0
  record('pool', '非饱和期 tools/list 正常（对照）', !!calm, `${calmMs}ms`)
  const sat = [301, 302, 303]
  for (const id of sat) c.send({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'browser_debugger_wait_paused', arguments: { max_ms: 12000 } } })
  await sleep(800)
  const lId = ++c.id; const t0 = Date.now(); c.send({ jsonrpc: '2.0', id: lId, method: 'tools/list', params: {} })
  const lFrame = await c.waitId(lId, 20000); const listMs = Date.now() - t0
  record('pool', '饱和期 tools/list 由读线程快答（<1000ms）', !!lFrame && listMs < 1000, `${listMs}ms（修前实测 11267ms）`)
  const pId = ++c.id; const p0 = Date.now(); c.send({ jsonrpc: '2.0', id: pId, method: 'ping', params: {} })
  const pFrame = await c.waitId(pId, 20000); const pingMs = Date.now() - p0
  record('pool', '饱和期 RPC ping 快答', !!pFrame && pingMs < 1000, `${pingMs}ms`)
  const rId = ++c.id; const r0 = Date.now(); c.send({ jsonrpc: '2.0', id: rId, method: 'tools/call', params: { name: 'ping', arguments: {} } })
  const rFrame = await c.waitId(rId, 20000); const rejMs = Date.now() - r0
  record('pool', '饱和期第 4 条 tools/call 不被静默排队', !!rFrame && rejMs < 3000, `${rejMs}ms`)
  for (const id of sat) await c.waitId(id, 30000)
  c.kill()
}

// ───────────────────────── 5) CDP 层诚实性（错误如实回报且不判死通道） ─────────────────────────
async function suiteCdp() {
  const c = new Client(EXE); await c.init()
  const nav = (await c.call('browser_navigate', { url: 'about:blank', max_ms: 15000 })).raw
  record('cdp', '准备：navigate 有回包', !!nav)
  const s1 = await c.call('browser_execute_js', { code: "Symbol('s')" }, 20000)
  const t1 = textOf(s1.raw || '')
  record('cdp', "Symbol('s') → 如实回报 CDP 原文且注明不回退重跑", /无法按值序列化|serializ/i.test(t1) && /不会回退重跑|不回退重跑/.test(t1), t1.slice(0, 80))
  const s2 = await c.call('browser_execute_js', { code: '({a:1})' }, 20000)
  const t2 = textOf(s2.raw || '')
  record('cdp', '紧随其后的 ({a:1}) 仍走 CDP 正常返回（通道未被判死）', t2.trim() === '{"a":1}', t2.slice(0, 60))
  const s3 = await c.call('browser_execute_js', { code: 'document.body' }, 20000)
  const t3 = textOf(s3.raw || '')
  record('cdp', 'document.body → 诚实标注不可序列化', /不可序列化的值/.test(t3), t3.slice(0, 60))
  c.kill()
}

// ───────────────────────── 6) 客户端兼容矩阵（帧风格 × 协议版本） ─────────────────────────
// 诚实边界：这是**协议级**矩阵（把真实客户端的行为抽象成帧风格与握手变体），
//   真实 GUI 客户端（Claude Desktop / Cursor / Trae 等）需各自安装后用 --print-config 的配置实测。
async function rawHandshake(style, protocolVersion = '2024-11-05', extra = {}) {
  const c = new Client(EXE)
  const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion, capabilities: {}, clientInfo: { name: 'matrix', version: '1' }, ...extra } }
  const bare = JSON.stringify(init) + '\n'
  const body = JSON.stringify(init)
  if (style === 'cl-crlf') c.sendRaw(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`)
  else if (style === 'cl-lf') c.sendRaw(`Content-Length: ${Buffer.byteLength(body)}\n\n${body}`)
  else c.sendRaw(bare)                                   // bare
  const okInit = await c.ready() && !!(await c.waitId(1, 15000))
  // tools/list 用与握手同风格
  const tl = { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }
  if (style === 'bare') c.send(tl)
  else c.sendRaw(`Content-Length: ${Buffer.byteLength(JSON.stringify(tl))}${style === 'cl-lf' ? '\n\n' : '\r\n\r\n'}${JSON.stringify(tl)}`)
  const tlFrame = await c.waitId(2, 20000)
  let toolCount = -1; try { toolCount = (JSON.parse(tlFrame).result?.tools || []).length } catch {}
  // 一个真实工具调用
  const call = { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'browser_json', arguments: { data: '{"ok":1}' } } }
  if (style === 'bare') c.send(call)
  else c.sendRaw(`Content-Length: ${Buffer.byteLength(JSON.stringify(call))}${style === 'cl-lf' ? '\n\n' : '\r\n\r\n'}${JSON.stringify(call)}`)
  const callFrame = await c.waitId(3, 20000)
  c.kill()
  return { okInit, tlFrame, toolCount, callFrame }
}
async function suiteMatrix() {
  const styles = [['cl-crlf', '标准 Content-Length（CRLF）'], ['cl-lf', 'Content-Length 仅用 LF（部分客户端）'], ['bare', '裸行 JSON（一行一帧）']]
  for (const [style, label] of styles) {
    const r = await rawHandshake(style)
    record('matrix', `${label} → 握手 + tools/list(348) + 工具调用`, r.okInit && r.toolCount === 348 && !!r.callFrame, `tools=${r.toolCount} call=${!!r.callFrame}`)
  }
  for (const ver of ['2024-11-05', '2025-06-18', 'bogus-9.9']) {
    const r = await rawHandshake('cl-crlf', ver)
    record('matrix', `协议版本 ${ver} → 仍能握手并服务（不因版本不同拒绝）`, r.okInit && r.toolCount === 348, `tools=${r.toolCount}`)
  }
  const r2 = await rawHandshake('cl-crlf', '2024-11-05', { capabilities: { roots: { listChanged: true }, sampling: {} }, clientInfo: { name: 'rich-client', version: '2.0' } })
  record('matrix', '带 capabilities/roots/sampling 的丰富握手 → 正常', r2.okInit && r2.toolCount === 348, `tools=${r2.toolCount}`)
}

// ───────────────────────── 7) 浸泡 + 资源曲线（冒烟级泄漏检查） ─────────────────────────
// 诚实边界：这是**冒烟级**检查——能发现"明显单调增长"，不能证明"无泄漏"。
function sampleProc(pid) {
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `$p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if($p){ "$($p.WorkingSet64),$($p.PrivateMemorySize64),$($p.HandleCount),$($p.Threads.Count)" }`], { encoding: 'utf8', timeout: 15000 }).trim()
    if (!out) return null
    const [ws, priv, handles, threads] = out.split(',').map(Number)
    return { ws, priv, handles, threads }
  } catch { return null }
}
async function suiteSoak() {
  const minutes = Number(arg('--minutes', '5'))
  const c = new Client(EXE); await c.init()
  const pid = c.child.pid
  const mix = [
    async () => c.call('ping', {}, 15000),
    async () => { const id = ++c.id; c.send({ jsonrpc: '2.0', id, method: 'tools/list', params: {} }); return { raw: await c.waitId(id, 20000) } },
    async () => c.call('browser_json', { data: '{"n":1}' }, 15000),
    async () => c.call('browser_count', {}, 15000),
    async () => c.call('browser_get_title', {}, 15000),
    async () => c.call('browser_execute_js', { code: '2+2' }, 20000),
  ]
  const lat = []; const samples = []
  let bad = 0, i = 0
  const t0 = Date.now(), deadline = t0 + minutes * 60000
  let nextSample = t0
  console.log(`  浸泡 ${minutes} 分钟，混合作业 ${mix.length} 种，每 15s 采样一次进程资源…`)
  while (Date.now() < deadline) {
    const s = Date.now()
    const r = await mix[i++ % mix.length]()
    const ms = Date.now() - s
    if (!r || !r.raw) bad++; else lat.push(ms)
    if (c.exited !== null) { record('soak', '浸泡期间服务器未退出', false, `exit=${c.exited} @${Math.round((Date.now() - t0) / 1000)}s`); c.kill(); return }
    if (Date.now() >= nextSample) { nextSample = Date.now() + 15000; const sm = sampleProc(pid); if (sm) { samples.push({ t: Math.round((Date.now() - t0) / 1000), ...sm }); console.log(`    t=${String(samples[samples.length - 1].t).padStart(4)}s  工作集=${(sm.ws / 1048576).toFixed(1)}MB  私有=${(sm.priv / 1048576).toFixed(1)}MB  句柄=${sm.handles}  线程=${sm.threads}`) } }
    await sleep(60)
  }
  const p = q => { const a = [...lat].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * q))] : -1 }
  record('soak', `浸泡完成：作业 ${lat.length + bad} 次，无回包 ${bad} 次`, bad === 0, `p50=${p(0.5)}ms p95=${p(0.95)}ms max=${lat.length ? Math.max(...lat) : -1}ms`)
  if (samples.length >= 3) {
    const first = samples[0], last = samples[samples.length - 1], span = Math.max(1, last.t - first.t) / 60
    const dWs = (last.ws - first.ws) / 1048576, dH = last.handles - first.handles
    record('soak', `工作集增长 ${dWs.toFixed(1)}MB / ${span.toFixed(1)}min（阈值 <150MB）`, dWs < 150, `首 ${(first.ws / 1048576).toFixed(1)}MB → 末 ${(last.ws / 1048576).toFixed(1)}MB`)
    record('soak', `句柄增长 ${dH} / ${span.toFixed(1)}min（阈值 <200）`, dH < 200, `首 ${first.handles} → 末 ${last.handles}`)
    record('soak', '服务器浸泡结束时仍存活', c.exited === null, `exit=${c.exited}`)
  } else record('soak', '资源采样点 ≥3', false, `仅 ${samples.length} 点（把 --minutes 调大）`)
  c.kill()
}

// ───────────────────────── 主流程 ─────────────────────────
const suites = { sweep: suiteSweep, frames: suiteFrames, transport: suiteTransport, pool: suitePool, cdp: suiteCdp, matrix: suiteMatrix, soak: suiteSoak }
const pick = SUITE === 'all' ? Object.keys(suites) : [SUITE]
console.log(`\n══════ 小刀 MCP 回归套件 ══════`)
console.log(`  exe   = ${EXE}`)
console.log(`  套件  = ${pick.join(', ')}`)
for (const s of pick) { console.log(`\n──── ${s} ────`); if (!suites[s]) { record(s, '未知套件', false); continue } await suites[s]() }
const fail = results.filter(r => !r.ok)
console.log(`\n══════ 汇总 ══════`)
console.log(`  通过 ${results.length - fail.length} / ${results.length}${fail.length ? '   失败: ' + fail.map(f => f.name).join(' | ') : '   ✅ 全部通过'}`)
process.exit(fail.length ? 1 : 0)
