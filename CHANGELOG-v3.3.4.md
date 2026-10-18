# v3.3.4 变更记录（2026-10-19）

## 版本升级

- `MCP_版本号`、exe 文件版本/产品版本、工程 `version_name` 全部升级到 **3.3.4**。
- 工具数 348 → **349**，新增 `mcp_doctor` 配置/运行自检。
- 新增程序图标：`assets/logo.ico`（16–256 多尺寸）与 `assets/logo.png/svg`；Windows exe 已嵌入图标。

## P0/P1 修复

- 初始化后首个浏览器创建竞态：首个 `browser_*` 调用不再偶发“没有可用的浏览器”。
- `batch` 的 `commands` 为字符串 `"[]"` 时进程静默退出：改为按 JSON 节点类型闸门解析，空数组/缺参明确失败。
- CDP 暂停态挂起：`browser_cdp_call` 与 `browser_vip_dom_get_document` 在 `Debugger.paused` 下快速返回可操作错误，不再拖垮 CDP 健康度。
- `browser_kernel_cdp_monitor/cert/download/reactor/watch` 未知 action 静默成功：改为明确失败。
- CDP 监控 `action=clear` 假清空：同时清理订阅、`event_log(cdp_monitor/cdp_event)` 与 `async_results(cdp_event:*)`。
- `browser_fingerprint_java_enabled` 假成功：设置后回读校验，不一致明确失败（本内核实测不支持）。
- `browser_evaluate` 把 `undefined` 回成 `"null"`：现在区分 `undefined`/`null`。
- 隐藏窗口下 `browser_mouse_wheel`、`browser_touch_press/move/release` 自愈：临时显示窗口 + 600ms 等待后重试。
- `browser_debugger_flow` 断点未命中：默认自动制造暂停点完成求值，回包用 `paused_via` 标注。
- `browser_debugger_set_breakpoint` 的 `locations:[]`：新增 `locations_bound`/warning，避免死等。
- `notifications/cancelled` 无法中断直接等待：新增进程内取消集合，`wait_paused`/`flow` 可在约 1s 内返回取消。
- 内层子命令未知被误报为“外层工具不存在”：保留内层错误与最后失败原因。

## UX / Token / 可维护性

- `tool_profile=all/core/reverse/debug`：`core` 仅暴露 97 个日常工具，`tools/list` 紧凑体积约
  199,776B → 56,807B（约 -71.6%，按 `mcp-probe` 生成的 JSON 文件大小计）。
- 新增 `mcp_doctor`：返回版本/路径/配置/工具数/浏览器/VIP/CDP/缓存与可行动建议。
- 配置校验告警：`tool_profile`、`window_width/height` 非法值会进入 `config_warnings`。
- `--debug` / `AI_BROWSER_MCP_DEBUG=1`：每次 `tools/call` 向 stderr 输出一行结构化 trace（不含参数内容）。
- 默认拒绝云元数据端点（可配置 `allow_cloud_metadata_endpoints`），收紧 `vip_filter_replace_file`/
  `intercept replace_file` 的本地文件读取范围到运行目录。
- `prompts/get` 补齐；`tasks/list` 只列标准 `task_*`；`completion/complete` 按标准 ref 语义返回。

## 升级说明

- 直接替换 `AI-Fbowser-Mcp.exe` 并保留原 `mcp_config.json` 即可；新配置项缺省值兼容旧行为。
- 本机已同步 `Mcp-Browser\browser` 与旧版 AppData 安装到 3.3.4，并补齐 `libcef.dll` 等运行库。
