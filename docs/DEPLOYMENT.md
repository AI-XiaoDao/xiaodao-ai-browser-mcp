# 部署 / Deployment

## 方式一：解压即用
1. 解压成品包到任意可写目录（**建议非系统盘或用户目录**，例如 %LOCALAPPDATA%\Programs\XiaodaoMCP\）
2. 运行 AI-Fbowser-Mcp.exe --print-config，把输出 JSON 合并进客户端配置
3. 首次启动会自动创建缓存库与浏览器实例（窗口默认隐藏、不占桌面）

## 方式二：接入其他 MCP 客户端
1. 运行 `AI-Fbowser-Mcp.exe --print-config`，复制输出的 `mcpServers` JSON
2. 合并到客户端配置（Cursor、Claude Desktop、Codex、Cline、Windsurf、Trae、Cherry Studio、Roo Code、DeepSeek Harness、WorkBuddy 等）
3. 重启客户端，确认 `tools/list` 返回 **351** 个工具

> 本版不随包提供 DSH/WorkBuddy 一键安装器；客户端接入统一走标准 MCP stdio 配置。

## 目录与占用
| 项 | x64 | x86 |
|---|---|---|
| 文件数 | 108 | 108 |
| 解压后 | 401,931,925 B（383.3 MiB） | 331,321,208 B（316.0 MiB） |
| 压缩包 | 170,216,669 B（166,227 KB） | 147,352,411 B（143,899 KB） |
运行时目录内会增长：mcp_cache.db*（缓存库，含 -wal/-shm）、CacheData\（浏览器缓存）、mcp_console.log（日志，8MB 滚动）、*.quarantine_*（隔离产物，最多保留 3 套）。

## 环境变量
| 变量 | 作用 |
|---|---|
| AI_BROWSER_MCP_STDERR_UTF8=1 | 日志改 UTF-8（默认 936/GBK）。非中文 Windows 建议设置 |
| AI_BROWSER_MCP_TOOLS_DIR | 工具目录（一般无需手工设置） |

## 无人值守/静默部署注意
- 程序是**控制台程序**：stdio 模式下主浏览器窗口创建后会自动隐藏（需要时用 browser_show_window {visible:true}）
- 只需 stdin/stdout 管道，**无需开放任何网络端口**；若企业防火墙/EDR 按"无网络监听"策略放行即可
- 结束进程请用 browser_shutdown 或正常关闭；强杀会留下缓存库残留，下次启动先做 `PRAGMA quick_check`：健康库保留并 checkpoint，仅损坏或无法打开时隔离换新
- **未做代码签名** ⇒ SmartScreen 可能提示；企业分发前建议自行签名或加入白名单
