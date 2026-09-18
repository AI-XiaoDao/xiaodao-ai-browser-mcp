# 部署 / Deployment

## 方式一：解压即用
1. 解压成品包到任意可写目录（**建议非系统盘或用户目录**，例如 %LOCALAPPDATA%\Programs\XiaodaoMCP\）
2. 运行 AI-Fbowser-Mcp.exe --print-config，把输出 JSON 合并进客户端配置
3. 首次启动会自动创建缓存库与浏览器窗口

## 方式二：DSH 安装器（一键）
dsh-installer-v3.3.3-full.zip 内含安装向导：选安装位置 → 自动装 Node 与 DSH → 写 MCP 插件配置并启用（**安装器本体与 v3.3.2 相同，仅内层 MCP 载荷升级为 3.3.3**）。

## 目录与占用
| 项 | x64 | x86 |
|---|---|---|
| 文件数 | 100 | 98 |
| 解压后 | ≈382 MB | ≈300 MB |
| 压缩包 | 161,446 KB | 139,452 KB |
运行时目录内会增长：mcp_cache.db*（缓存库，含 -wal/-shm）、CacheData\（浏览器缓存）、mcp_console.log（日志，8MB 滚动）、*.quarantine_*（隔离产物，最多保留 3 套）。

## 环境变量
| 变量 | 作用 |
|---|---|
| AI_BROWSER_MCP_STDERR_UTF8=1 | 日志改 UTF-8（默认 936/GBK）。非中文 Windows 建议设置 |
| AI_BROWSER_MCP_TOOLS_DIR | 工具目录（安装器会自动写入，手工部署一般无需设置） |

## 无人值守/静默部署注意
- 程序是**控制台程序**：stdio 模式下主浏览器窗口创建后会自动隐藏（需要时用 rowser_show_window {visible:true}）
- 只需 stdin/stdout 管道，**无需开放任何网络端口**；若企业防火墙/EDR 按"无网络监听"策略放行即可
- 结束进程请用 rowser_shutdown 或正常关闭；强杀会留下缓存库残留（下次启动会自动隔离并换新库，属已处理路径而非故障）
- **未做代码签名** ⇒ SmartScreen 可能提示；企业分发前建议自行签名或加入白名单