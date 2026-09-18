# 兼容性 / Compatibility

## 客户端（协议级矩阵，2026-09-19 实测 7/7 通过）
| 维度 | 变体 | 结果 |
|---|---|---|
| 帧风格 | 标准 Content-Length(CRLF) / 仅 LF / 裸行 JSON | 均：握手 + 	ools/list(348) + 真实工具调用 ✅ |
| 协议版本 | 2024-11-05 / 2025-06-18 / 伪造版本 | 均可握手并服务（不按版本拒绝）✅ |
| 握手丰富度 | 带 capabilities.roots/sampling + clientInfo | ✅ |

> 边界：以上是**协议级**矩阵（把客户端抽象为帧风格与握手变体）。Claude Desktop / Cursor / Trae 等 GUI 客户端需各自安装后用 --print-config 的配置实测，本表**不替代**真实客户端验证。

## 操作系统与架构
- Windows 10/11（x64 成品另有 x86 成品）；控制台程序，本地桌面会话
- 无 .NET / Java / Python 依赖；**与 Node.js 无关**（Node 仅 DSH 安装器一键部署时使用，MCP 本体不依赖）

## 内核
- CEF / Chromium（真实版本从运行库读取）：libcef.dll = `135.0.21+gd008a99+chromium-135.0.7049.115`，chrome_elf.dll = `135.0.7049.115`（Company: The Chromium Authors）
- 反检测/指纹工具依赖内核事件域，行为随内核版本变化；升级 CEF 时请重跑回归套件

## 工具集
共 **348** 个工具（	ools/list 实测计数）。	ools/list 只发短描述，详述由 mcp_help 按需返回，以控制每个会话的固定开销。