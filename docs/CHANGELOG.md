# 更新日志 / Changelog

## v3.3.4 (2026-10-19)
**商业级审计修复 + Logo + Token 优化。**
- 版本号/工程版本/exe 版本统一升级到 3.3.4；新增程序图标 `assets/logo.ico`（16–256 多尺寸）
- 工具数 348 → 349：新增 `mcp_doctor` 配置/运行自检
- 修复初始化首个浏览器竞态、`batch` 字符串/空数组崩溃、CDP 暂停态挂起、CDP 监控假清空、
  内核未知 action 假成功、`java_enabled` 假成功、`undefined→null`、滚轮/触摸隐藏态自愈、
  断点零命中提示与自动暂停回退、取消通知无法中断等待等问题
- 新增 `tool_profile=all/core/reverse/debug`；`core` 97 工具的 tools/list 体积约 -71.6%
- 新增 `--debug` 结构化 stderr trace、配置校验告警、云元数据端点 SSRF 防护

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
