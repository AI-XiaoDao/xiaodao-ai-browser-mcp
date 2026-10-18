# 小刀 AI 浏览器 MCP v3.3.4 · 全维度审计报告与验收

## 0. 概览

| 项 | 内容 |
|---|---|
| 技术栈 / 版本 | 火山视窗（Volcano PC）x64，`MCP_版本号=3.3.4` |
| 传输层 | **仅 stdio**（产品已移除 HTTP/WS/SSE 端口） |
| 已声明工具数 | **349**（原 348 + `mcp_doctor`） |
| 协议基线 | JSON-RPC 2.0；兼容 2024-11-05 / 2025-06-18 / 2026-07-28 `server/discover` |
| 总体结论 | **本机 x64 可上线**；0 无回包/0 崩溃/0 永久挂起已达标；“所有工具在任意合法业务状态下 100% 成功”仍需按工具逐条构造正常态样本 |
| P0 / P1 / P2 / P3 | P0 3 项已修；P1 12 项已修；P2 7 项已修；P3 3 项已落地；已知边界 6 项 |

## 1. 问题明细（已修 / 已复核）

| 编号 | 类别 | 等级 | 位置 | 问题 | 修复 / 现状 |
|---|---|---|---|---|---|
| F-01 | 功能 | P0 | `main.wsv` + `执行浏览器命令` | 初始化后首个 `browser_*` 调用早于浏览器创建，偶发“没有可用的浏览器” | 对依赖浏览器的命令做 3s 有界等待；首调回归 185ms 成功 |
| F-02 | 功能 | P0 | `MCP_Server.wsv:处理_批量操作` | `batch.commands` 为字符串 `"[]"` 时把文本当数组迭代，进程静默退出 | 按 JSON 节点类型闸门；缺参/空数组明确报错；8/8 回归通过 |
| F-03 | 协议/功能 | P0 | `browser_cdp_call` / `vip_dom_get_document` / 触摸 | 页面 `Debugger.paused` 时 CDP 全局命令长时间无回执并拖垮通道 | 暂停态快速返回可行动错误；`browser_debugger_evaluate` 提供帧内求值替代；专项 7/7 |
| F-04 | 功能 | P1 | `MCP_Kernel.wsv` | 5 个 kernel 工具未知 action 静默退化为 list 并回 success | 未知 action 明确失败；5/5 由假成功转可操作错误 |
| F-05 | 功能 | P1 | `分派_CDP监控` | `clear` 只清订阅，不清持久化事件，list/`browser_cdp_event` 仍返回旧事件 | 同时清 `event_log(cdp_monitor/cdp_event)` 与 `async_results(cdp_event:*)`；clear 后为空 |
| F-06 | 功能 | P1 | `browser_fingerprint_java_enabled` | 回“已设置”，实测 `navigator.javaEnabled()` 恒 false | 设置后回读校验；不一致明确失败并说明本内核不支持 |
| F-07 | 功能 | P1 | `browser_evaluate` | `undefined` 被回成 `"null"`，语义丢失 | 返回 `[undefined] ...`，与 null 区分 |
| F-08 | UX/功能 | P1 | `browser_mouse_wheel` | 隐藏窗口自愈立即重试仍失败，与描述不符 | 显示窗口后等待 600ms 再重试；隐藏态 683ms 成功 |
| F-09 | UX/功能 | P1 | `browser_touch_press/move/release` | 隐藏窗口不自愈；暂停态首触无回包 | 临时显示窗口 + 600ms 重试；暂停态快速返回可行动错误；专项 7/7 |
| F-10 | 功能/UX | P1 | `browser_debugger_flow` | 断点零命中只回 timeout，调用方需再手工暂停一轮 | 新增 `auto_pause_fallback`（默认 true）；回包 `paused_via` 标注来源；未命中 9.3s 返回活帧 |
| F-11 | UX | P1 | `browser_debugger_set_breakpoint` | `locations:[]` 仍回 success，调用方死等 | 新增 `locations_bound` 与 warning；建议 `get_possible_breakpoints` |
| F-12 | 协议 | P1 | `notifications/cancelled` + 等待循环 | `browser_debugger_wait_paused` 收到取消仍不回包 | 进程内取消集合 + 等待轮询；取消后 937ms 返回，服务仍存活 |
| F-13 | UX/错误归因 | P1 | `处理_工具调用` | 内层子命令未知被误报为“外层工具不存在” | 仅外层名匹配才回工具不存在；保留内层错误与最后失败原因 |
| F-14 | 安全 | P1 | `browser_vip_filter_replace_file` / `browser_intercept replace_file` | 可读取运行目录外任意本地文件作为替换内容 | 统一 `验证安全路径(...,真)`；`vip` 版补文件存在性校验 |
| F-15 | 安全 | P1 | `验证URL安全` | 默认不拦截云元数据端点（SSRF） | 默认拒绝 `169.254.169.254` / `metadata.google.internal` / `metadata.azure.com`；可用 `allow_cloud_metadata_endpoints=true` 显式放开 |
| F-16 | 协议 | P2 | `prompts` 能力 | `prompts/list` 有 4 个模板，但无 `prompts/get` | 补齐 `prompts/get`，未知模板回 -32602 |
| F-17 | 协议 | P2 | `tasks/list` | 把 `_rtev_*` / `cdp_event:*` 内部缓存键当任务返回 | 只列标准 `task_*`；协议探针 `tasks/list` 已为空 |
| F-18 | 协议 | P2 | `completion/complete` | 无视 ref，把 prompt 参数补全成工具名 | 标准 `ref/prompt` / `ref/resource` 返回空候选；不再误导 |
| F-19 | 协议 | P2 | capabilities | 声明 `logging` 但无 `notifications/message` | 不再声明 logging；`logging/setLevel` 保留兼容并如实说明 |
| F-20 | 协议/UX | P2 | schema | `dom_select` 未标 index 必填；`frame_by_id` 强制 frame_id 但实现接受 id | 分别修正 required 与“frame_id/id 至少一个”口径 |
| F-21 | UX | P2 | 配置加载 | 非法 `tool_profile` / 窗口尺寸静默回退 | 记录 `config_warnings`，`mcp_doctor` 原样返回并给修复建议 |
| F-22 | 调试 | P2 | `main.wsv` / `处理_工具调用` | 无结构化 trace | `--debug` / `AI_BROWSER_MCP_DEBUG=1` 输出 stderr JSON：ts/requestId/tool/ok/ms/outBytes，不含参数内容 |
| F-23 | Token | P3 | `添加工具JSON` | 349 工具全量上下文成本高 | 新增 `tool_profile=all/core/reverse/debug`；`core` 97 工具 |
| F-24 | UX | P3 | 新工具 | 接入/排障缺统一入口 | 新增 `mcp_doctor`：版本/路径/配置/工具数/浏览器/VIP/CDP/缓存/建议 |
| F-25 | 品牌/交付 | P3 | `assets` + `.vprj` | 无程序 Logo，版本仍为 3.3.3 | 新增 SVG/PNG/ICO Logo 并嵌入 exe；版本统一 3.3.4；源码仓/成品仓/本机运行时已更新 |

## 2. 100% 调用成功率达成对照

| 韧性机制 | 状态 | 证据 / 说明 |
|---|---|---|
| 瞬时故障有限重试 | 部分 | 提供 `browser_retry`（线性退避、自引用防护）；浏览器本地调用未做全局自动重试，避免写副作用 |
| 熔断器 + 半开 | 不适用 | 本产品是本地浏览器进程，无远程上游 API；CDP 健康度已有快速失败与 5 分钟复探 |
| 分层超时 | 是 | 同步等待预算、`max_ms` 夹取、CDP 暂停态守卫、取消通知 |
| 结构化降级 / `isError` | 是 | 业务失败走 `content + isError:true`；协议错误使用 JSON-RPC error |
| 入参 schema + 语义前置校验 | 部分 | 关键路径有显式校验；349 工具 schema 尚未逐个做到 `additionalProperties:false`（公共参数设计允许扩展） |
| 写操作幂等键 | 部分 | 高危操作需 confirm；未引入通用 Idempotency-Key（本地浏览器写操作多为页面级，需业务语义） |
| request_id 全链路追踪 | 是 | `--debug` 每次 tools/call 输出 requestId/tool/耗时/回包字节 |
| 并发 id 配对 / 背压 | 是 | 帧套件 10/10、传输 3/3、池 4/4；3 工作线程 + 读线程快答 |
| 取消 | 是 | `browser_debugger_wait_paused` 取消后 937ms 回包，服务存活 |

## 3. Token 优化对比

口径：`tools/list` 工具数组 JSON 紧凑序列化字节数（`ConvertTo-Json -Compress`）。

| 项 | 优化前（all） | 优化后（core） | 降幅 |
|---|---:|---:|---:|
| 工具数 | 349 | 97 | -72.2% |
| tools/list 紧凑字节 | 112,720 | 31,666 | **-71.9%** |

另有 `mcp_help` 分层描述、`mcp_doctor` 一次自检、错误文案可行动化，减少多轮试错与重复上下文。

## 4. 验收与回归结果

| 用例 | 预期 | 实测 | 通过 |
|---|---|---|---|
| 349 工具 schema 驱动冒烟 | 全部有回执，0 崩溃/0 永久挂起 | **255 ok + 94 可操作错误 + 0 no-reply + 0 exit** | ✅ |
| 初始化首调竞态 | 首次 navigate/show_window 成功 | 6/6 通过，首调 185ms | ✅ |
| batch 缺参/空数组/字符串 | 不崩溃，明确错误 | 8/8 通过（有效 batch=1 成功） | ✅ |
| 暂停态 CDP / DOM / 触摸 | 快速可操作错误，不拖垮通道 | 7/7 通过；恢复后 cdp/dom 正常 | ✅ |
| 取消通知 | 1s 级回包，服务存活 | 937ms，`aliveAfter=true` | ✅ |
| 帧族 P1–P8 | 全部回包或显式 -32700/优雅退出 | 10/10 | ✅ |
| 传输 A/B/C | 不永久挂起 | 3/3 | ✅ |
| 工作池饱和 | tools/list/ping <1000ms，第 4 条可观测拒绝 | 4/4（62ms/92ms） | ✅ |
| CDP 诚实性 | 不可序列化如实回报，不回退重跑 | 4/4 | ✅ |
| 客户端矩阵 | 3 帧风格 × 协议版本 × 丰富握手 | 7/7，tools=349 | ✅ |
| 安全路径/协议/SSRF | 目录外文件、file/data、元数据端点被拒 | 11/11 | ✅ |
| 本机运行时 | 3.3.4 且 349 工具 | 主运行时/旧安装均 `ping=3.3.4` | ✅ |

证据文件：`smoke-all7.json`、`protocol-report2.json`、`report-security2.json`、`report-batch2.json`、`report-paused.json`、`report-touch-paused.json`。

## 5. A–K 覆盖矩阵

| 维度 | 状态 | 说明 |
|---|---|---|
| A 功能/边界/生命周期 | 已覆盖并修复重点 | 349 冒烟 0 无回包；正常业务态逐工具样本仍需继续补齐 |
| B MCP 协议 | 已覆盖 | stdio/JSON-RPC/错误码/能力声明/取消/tasks/prompts；Streamable HTTP/SSE 不适用 |
| C UX/配置/调试 | 已改善 | `mcp_doctor`、配置告警、`--debug`、prompts/get、错误可行动 |
| D Token | 已改善 | core 预设 -71.9%；描述分层与自检减少试错 |
| E 可维护性 | 部分 | 抽取触摸/取消/暂停守卫等单一实现；路由仍是 if-else 链，声明式注册待后续 |
| F 多 Agent | 部分/不适用 | 单进程 3 工作线程 + 锁；跨副本分布式状态不适用 |
| G 安全 | 已改善 | 路径穿越、file/data 协议、云元数据 SSRF、密钥不落工具结果；无远程鉴权模型（stdio 本地） |
| H 商业上游 | 不适用 | 无远程厂商 API；浏览器页面请求由用户环境决定 |
| I 性能/资源 | 已覆盖 | 池饱和快答、超时有界、取消清理；历史浸泡证据保留 |
| J 观测/兼容/测试/文档 | 部分 | doctor/status、debug trace、协议矩阵；P50/P95 指标尚未逐工具导出 |
| K 工具设计 | 已改善 | 349 唯一名、`mcp_doctor`、profile、描述分层；近义工具合并仍需产品决策 |

## 6. 已知边界（未虚报）

1. 本产品**仅 stdio**；Streamable HTTP / SSE / `Mcp-Session-Id` 不适用，未声明也不实现。
2. exe **未做代码签名**，SmartScreen 可能提示。
3. 未提供逐工具 P50/P95 指标；当前有池快答、db 统计与 doctor 自检。
4. CDP 通道可被 VIP 内核开关（如禁用 Debugger/关闭观察者）主动失效；工具会明确报错并要求重启，不会静默假成功。
5. 349 冒烟的 94 个错误中，包含大量“空参/占位参数”校验与 CDP 已禁用状态；这不等于 349 个工具在任意合法业务态都已 100% 成功，仍需逐工具正常态样本。
6. 自动化重试/熔断主要面向远程上游；本地浏览器写操作不做无条件自动重试，避免重复点击/提交。

## 7. 交付与仓库

- 版本：**3.3.4**；工具数 **349**；x64 `0 错误 0 警告`
- 源码仓：`AI-XiaoDao/xiaodao-ai-browser-mcp-src`，main `6dc7c67`，tag `v3.3.4`
- 成品仓：`AI-XiaoDao/xiaodao-ai-browser-mcp`，main `18f66a3`
- Release：`https://github.com/AI-XiaoDao/xiaodao-ai-browser-mcp/releases/tag/v3.3.4`
- 本机：`Mcp-Browser\browser`、旧 AppData 安装、Codex/DSH/Trae 配置均已切到 3.3.4
