# CHANGELOG v3.3.7（2026-11-14）

本版基于 v3.3.6，完成 r131–r152 连续 22 轮深审与修复。核心目标：分页一致性、
AI 调用语义、事件时间线可读性、Promise 求值、schema 一致性、资源占用。

## 分页与游标

- `browser_cdp_monitor`：offset 分页 + `before_id` 游标（单语句 rows+ids，`id DESC`）。
- `browser_network`：offset 分页 + `before_id` 游标；空页合法。
- `browser_event`：offset + `before_id`；默认时间线只含 browser/app 事件。
- `browser_console_get`：offset + `before_id`；keyword 精确 total。
- `browser_network_export`：offset 分页，返回 `next_offset`。
- 所有分页返回 `truncated / next_offset / next_before_id`，空页不再报错。

## AI 调用稳定性

- 空参调用统一返回 `success:true, usage:true`，JSON-RPC 外层显式 `isError:false`
  （硬故障仍为 true）。
- `browser_evaluate` / `browser_execute_js` 新增 `await_promise`：Promise 首轮等待解析，
  不再误报“可能有副作用”，也不会重复执行表达式。
- `browser_evaluate` 修复不可序列化结果的二次执行风险（throwOnSideEffect）。
- `browser_wait{what:"load_end"}` 已加载时同步快返；`timeout` 允许省略 value。
- 顺序 `batch` 补齐 `partial / next_action`；外层仅在全失败时 isError。
- `browser_snapshot include_json=false` 返回真数组。

## 事件与用户体验

- 默认事件时间线排除 `app_startup_*` 启动噪声；子进程事件补充 `program/type`。
- 事件查询零结果改为 `count:0` 空成功，支持清单与诊断说明放入 `note`。
- `browser_event` 零结果/未命中不再返回 isError。

## Schema 一致性

- 351 工具 schema 静态扫描：`BAD=0`；`browser_create.make_current` 重复键已修。
- `browser_execute_js` 重复 `async_only` 键已修。
- `browser_wait` / `browser_vip_dom_get_document` 描述中误拼的 schema 片段已清理。
- `schema-static-scan` 接入 `mcp-suite --suite sweep` 硬门槛。

## 稳定性与资源

- 修复 `browser_evaluate` 大结果/不可序列化结果的回退重跑问题。
- 事件库保留策略复核：async 24h/5 万条、event 14 天/5 万条、response cache 14 天/5000 条，
  周期清理；resource-cycle 实测无句柄增长（dHandles≈161）。
- 全量门禁：351/351 工具回执、defect 0、valid-call 32/0、schema 0 FAIL、冷启动 <700ms。

## x86 构建（本轮补齐）

- 根因：`AI-Fbowser-Mcp.vprj` 缺少 `target_platform`，火山视窗默认按 64 位编译，
  导致 `dist/x86` 长期停留在 v3.3.6。
- 修复：工程属性显式 `target_platform = 0`（64 位）；32 位构建临时切 `1`，
  产物路径 `_int\AI-Fbowser-Mcp\release\win32\linker\AI-Fbowser-Mcp.exe`。
- 结果：x86 `8,663,552` 字节 / MD5 `F6AFC84286DD33CD9391F10DD5CE3941` /
  SHA256 `899D3278FB8EDA8E1E3DE72ADDA8AFE674F401D967113D76CDC009AD23902C86`，
  FileVersion / ProductVersion 均为 3.3.7，编译 0 警告 0 错误。
- 验证：351/351 工具回执（ok 164 / usage 186 / expected-reject 0 / defect 0 /
  unclassified 0），schema BAD=0，冷启动约 612ms，`isError=false`。
- 发布包：`xiaodao-ai-browser-mcp-v3.3.7-x86.zip`（110 文件，143,784,053 字节，
  SHA256 `7DDFA840DDD776B46688B430008908893FEB488928F9876C7027DE659B6D2ADD`，
  MD5 `E5BC8E092D7EE4F17DFC3AD5DD5B2197`）。
- 打包清洗：已剔除测试运行产生的 `CacheData/`、`mcp_cache.db*`、`mcp_console.log`、
  `log.txt`，压缩包内 BAD=0。

## 升级说明

- 直接替换 `AI-Fbowser-Mcp.exe`；若同时升级 CEF 运行库，必须整套替换
  `libcef.dll / FBrowserCEF3lib.dll / FBrowserVIP.dll / FBroSubprocess.exe`。
- 缓存库 `mcp_cache.db` 兼容旧版；如需干净重采，删除该文件后重启即可。

## 已知边界（非缺陷）

- `app_render_*` 在该部署中不入库（渲染进程事件不回传主进程），查询空结果会给出说明。
- offset 分页在持续写入下可能偏移，需要严格一致时用 `before_id` 游标。
- `await_promise` 对永不解析的 Promise 会等待到 `max_ms` 超时。
