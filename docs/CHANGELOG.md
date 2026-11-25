# 更新日志 / Changelog

## v3.3.9 (2026-11-25)
**CDP 假故障与多浏览器可用性修复。** 完整说明见 [CHANGELOG-v3.3.9.md](../CHANGELOG-v3.3.9.md)。
- `取CDP通道健康()` 仅在探测失败后的 5s 冷却期返回假；空闲 >60s 不再判死，空闲不再压缩调用方预算
- 卡死标记窗口 10min → 1min、预算下限 2s → 5s；`cdp_cooldown_remaining_ms` 统一按 5s 计算
- 多浏览器 CDP 改用原始 `开发者消息_发送消息` + 自有 id；新增 `CDP切换锁` 串行注销/重附着
- 400K CDP 封顶前移，截图二级降级 `jpeg40/960×540`；base64 >480K 自动落盘 `shots/`
- 非 JS 超时不再发 `Runtime.terminateExecution`；`browser_evaluate` schema 补 `async_only`
- stdio 双实例缓存隔离 `GlobalData_Stdio_<pid>`
- 回归：x64 `sweep` 351/351、`frames` 10/10、`cdp` 4/4；x86 完整包 `sweep` 351/351、`cdp` 4/4

v3.3.5–v3.3.8 详见根目录 [CHANGELOG-v3.3.6.md](../CHANGELOG-v3.3.6.md)、[CHANGELOG-v3.3.7.md](../CHANGELOG-v3.3.7.md)、[CHANGELOG-v3.3.8.md](../CHANGELOG-v3.3.8.md)。

## v3.3.4 (2026-10-19)
**商业级审计修复 + Logo + Token 优化。**
- 版本号/工程版本/exe 版本统一升级到 3.3.4；新增程序图标 `assets/logo.ico`（16–256 多尺寸）
- 工具数 348 → 349：新增 `mcp_doctor` 配置/运行自检
- 修复初始化首个浏览器竞态、`batch` 字符串/空数组崩溃、CDP 暂停态挂起、CDP 监控假清空、
  内核未知 action 假成功、`java_enabled` 假成功、`undefined→null`、滚轮/触摸隐藏态自愈、
  断点零命中提示与自动暂停回退、取消通知无法中断等待等问题
- 新增 `tool_profile=all/core/reverse/debug`；`core` 97 工具的 tools/list 体积约 -71.6%
- 新增 `--debug` 结构化 stderr trace、配置校验告警、云元数据端点 SSRF 防护
- 修复浏览器下载路径双反斜杠导致“回调完成但文件未落盘”；x64/x86 均验证实际写入 `Downloads`
- 优化宣传图与仓库布局：统一 349 工具、x64/x86、stdio-only 和真实 CEF 运行库口径
- 发布仓保持“只发布成品”，源码只在私密源码仓更新

## v3.3.3 (2026-09-19)
**唯一功能性变更：stderr 输出编码可切换（国际化）。**
- 新增环境变量 `AI_BROWSER_MCP_STDERR_UTF8`（`1/true/yes/on`）→ 日志走 UTF-8；默认仍为 936/GBK，**完全向后兼容**
- 实测：UTF-8 模式下按 UTF-8 解码替换符 **0** 个；默认模式下按 GBK 解码替换符 6 个
- 查实结论：默认模式 stderr 为**混合编码**（项目日志 GBK + CEF 子进程 UTF-8）；置变量后整条流统一 UTF-8
- 双架构重编（`0 错误 0 警告`）；回归 **7 套 34 项全过**

## v3.3.2
- 修复"隐式前置自动补齐"死代码（Debugger/Runtime 域未启用时自动补齐并重试，经 `auto_prepared` 如实上报）
- MCP 结果对象补挂 `auto_prepared`（此前被封装层静默丢弃）
- 预热自检不再把"主浏览器尚未注册"误判为缓存库毒化
- 隔离产物按"保留最近 3 套"回收，安装目录不再无上限膨胀
- 工作池饱和期 `tools/list` 由读线程快答（**11,267ms → 63ms**）
