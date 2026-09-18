# 已知边界 / Known limits

1. **未做代码签名** —— exe 未签名，Windows SmartScreen 会提示；企业环境可能拦截。
2. **缓存库"内容型"毒化** —— 触发条件**不可从外部构造**，目前只有启发式安全网（启动自检 + 隔离重建 + 隔离产物保留最近 3 套）；根因未定位。
3. **全忙期排队** —— 非 `tools/call` 的 `initialize` / `workflow_stop` 在工作池饱和时仍入队（**有界延迟，不会丢请求**）；`ping` 与 `tools/list` 已由读线程快答。
4. **日志编码** —— 默认 936/GBK（可用 `AI_BROWSER_MCP_STDERR_UTF8=1` 切 UTF-8）；默认模式下 CEF 子进程行本身是 UTF-8，故为混合编码。
5. **exe 不逐字节可复现** —— 链接时间戳不同 ⇒ 同一源码两次编译 MD5 不同（大小一致）；请以 Release 内层 MD5 为准。
6. **第三方依赖** —— 运行需 FBrowser/CEF 运行库（已随成品包提供）；构建需火山视窗编译器与 FBrowser 火山模块。